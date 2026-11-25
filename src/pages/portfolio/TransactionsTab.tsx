/**
 * The Transactions tab: the ledger, filtered, ordered and paged by the server. Columns, the expanded row and the CSV all come
 * from the field registry (`screens/portfolio/ledger.tsx`). Correct and Reverse show the not-connected error until the writes
 * ticket (86bd5z6mq) wires them.
 */
import { Fragment, useId, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Download, X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import {
  fetchAllTransactions,
  useClosedPositions,
  useCorrectTransaction,
  usePortfolioHoldings,
  useReverseTransaction,
  useTransactions,
} from '@/hooks/use-portfolio'
import { usePortfolioId } from '@/hooks/use-portfolio-id'
import { FieldList } from '@/components/FieldList'
import { Pager } from '@/components/Pager'
import { QueryError } from '@/components/QueryError'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useTransactionFilters } from '@/hooks/use-transaction-filters'
import { getErrorMessage } from '@/lib/api'
import { downloadFile, toCsv } from '@/lib/csv'
import { fieldText, fieldsFor, fieldsToCsvRows } from '@/lib/fields'
import { localDateInputValue } from '@/lib/format'
import { TX_TYPE_LABELS } from '@/lib/labels'
import { queryKeys } from '@/lib/query-keys'
import { isDateRangeInvalid, TRANSACTION_TYPES, transactionsQuery } from '@/lib/transactions'
import { cn } from '@/lib/utils'
import { TRANSACTION_FIELDS } from '@/screens/portfolio/ledger'
import type { PortfolioAccountView, TransactionType } from '@/types/portfolio'

const FILTER_CONTROL = 'h-8 rounded-md border border-border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary'
const RIGHT = new Set(['shares', 'price', 'total', 'amount_cad', 'fees', 'realised'])

interface TransactionsTabProps {
  accountFilter?: PortfolioAccountView
}

export function TransactionsTab({ accountFilter = 'combined' }: TransactionsTabProps) {
  const { filters, setFilters, clearFilters, isFiltered } = useTransactionFilters()
  const fieldId = useId()
  const { portfolioId } = usePortfolioId()

  // The page belongs to the filter and account it was chosen under; a new filter starts again at page one.
  const scope = transactionsQuery(filters, accountFilter)
  const [chosen, setChosen] = useState({ scope, page: 1 })
  const page = chosen.scope === scope ? chosen.page : 1
  const { data, isLoading, isError, error, refetch, isPlaceholderData } = useTransactions(filters, accountFilter, page)

  const holdings = usePortfolioHoldings()
  const closed = useClosedPositions()
  const positions = useMemo(() => [...(holdings.data ?? []), ...(closed.data ?? [])], [holdings.data, closed.data])
  // Always list the active ticker, even if no holding has it: otherwise the dropdown would say "All tickers" while the table is filtered.
  const tickers = useMemo(() => {
    const list = [...new Set(positions.map((h) => h.stock.ticker))]
    if (filters.ticker && !list.includes(filters.ticker)) list.push(filters.ticker)
    return list.sort()
  }, [positions, filters.ticker])
  const holdingTitle = filters.holdingId ? positions.find((h) => h.holding_id === filters.holdingId) : undefined

  const columns = useMemo(() => fieldsFor(TRANSACTION_FIELDS, 'column'), [])
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set())
  const dateRangeInvalid = isDateRangeInvalid(filters)
  const correct = useCorrectTransaction()
  const reverse = useReverseTransaction()

  const csv = useQuery({
    queryKey: queryKeys.portfolio.transactionsCsv(portfolioId ?? '', scope),
    enabled: false,
    queryFn: ({ signal }) => fetchAllTransactions(portfolioId ?? '', filters, accountFilter, signal),
  })

  async function handleExportCSV() {
    const { data: rows } = await csv.refetch()
    if (!rows?.length) return
    downloadFile(toCsv(fieldsToCsvRows(TRANSACTION_FIELDS, rows)), `transactions-${localDateInputValue()}.csv`)
  }

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (!next.delete(id)) next.add(id)
      return next
    })
  }

  if (isLoading) return <div className="h-48 rounded-lg bg-muted animate-pulse" />
  if (isError) return <QueryError what="transactions" error={error} onRetry={refetch} />

  const rows = data?.rows ?? []
  const meta = data?.meta
  const actionError = correct.error ?? reverse.error

  return (
    <div>
      {filters.holdingId && (
        <div className="flex items-center justify-between gap-2 mb-3 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
          <span>
            Showing full history for{' '}
            <span className="font-medium">
              {holdingTitle ? `${holdingTitle.stock.ticker} (${holdingTitle.account_type.toUpperCase()})` : 'one position'}
            </span>
          </span>
          <Button size="sm" variant="ghost" onClick={() => setFilters({ holdingId: null })}>
            Show all transactions
          </Button>
        </div>
      )}

      <div className="flex items-end justify-between mb-3 flex-wrap gap-3">
        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex flex-col gap-1">
            <label htmlFor={`${fieldId}-type`} className="text-xs text-muted-foreground">
              Type
            </label>
            <select
              id={`${fieldId}-type`}
              className={FILTER_CONTROL}
              value={filters.type}
              onChange={(e) => setFilters({ type: e.target.value as 'all' | TransactionType })}
            >
              <option value="all">All types</option>
              {TRANSACTION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {TX_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>
          {!filters.holdingId && (
            <div className="flex flex-col gap-1">
              <label htmlFor={`${fieldId}-ticker`} className="text-xs text-muted-foreground">
                Ticker
              </label>
              <select
                id={`${fieldId}-ticker`}
                className={FILTER_CONTROL}
                value={filters.ticker ?? ''}
                onChange={(e) => setFilters({ ticker: e.target.value || null })}
              >
                <option value="">All tickers</option>
                {tickers.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label htmlFor={`${fieldId}-from`} className="text-xs text-muted-foreground">
              From
            </label>
            <input
              id={`${fieldId}-from`}
              type="date"
              className={FILTER_CONTROL}
              value={filters.from ?? ''}
              max={filters.to ?? undefined}
              onChange={(e) => setFilters({ from: e.target.value || null })}
              aria-invalid={dateRangeInvalid || undefined}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={`${fieldId}-to`} className="text-xs text-muted-foreground">
              To
            </label>
            <input
              id={`${fieldId}-to`}
              type="date"
              className={FILTER_CONTROL}
              value={filters.to ?? ''}
              min={filters.from ?? undefined}
              onChange={(e) => setFilters({ to: e.target.value || null })}
              aria-invalid={dateRangeInvalid || undefined}
            />
          </div>
          {isFiltered && !filters.holdingId && (
            <Button size="sm" variant="ghost" onClick={clearFilters}>
              <X className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
              Clear filters
            </Button>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={handleExportCSV} disabled={!rows.length || csv.isFetching}>
          <Download className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
          {csv.isFetching ? 'Exporting…' : 'Export CSV'}
        </Button>
      </div>

      {dateRangeInvalid && (
        <p role="alert" className="text-xs text-destructive mb-3">
          The “From” date is after the “To” date.
        </p>
      )}
      {csv.isError && (
        <p role="alert" className="text-xs text-destructive mb-3">
          Export failed: {getErrorMessage(csv.error)}
        </p>
      )}
      {actionError && (
        <p role="alert" className="text-xs text-destructive mb-3">
          {getErrorMessage(actionError)}
        </p>
      )}

      {!rows.length ? (
        <p className="text-muted-foreground text-sm py-8 text-center">
          {isFiltered ? 'No transactions match these filters.' : 'No transactions yet.'}
        </p>
      ) : (
        <div className={cn('border border-border rounded-lg overflow-hidden', isPlaceholderData && 'opacity-60')}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">
                  <span className="sr-only">Details</span>
                </TableHead>
                {columns.map((spec) => (
                  <TableHead key={spec.id} className={RIGHT.has(spec.id) ? 'text-right' : undefined} title={spec.tooltip}>
                    {spec.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((t) => {
                const open = expanded.has(t.transaction_id)
                return (
                  <Fragment key={t.transaction_id}>
                    <TableRow>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-expanded={open}
                          aria-label={`${open ? 'Hide' : 'Show'} details of this entry`}
                          onClick={() => toggle(t.transaction_id)}
                        >
                          {open ? <ChevronDown className="w-4 h-4" aria-hidden="true" /> : <ChevronRight className="w-4 h-4" aria-hidden="true" />}
                        </Button>
                      </TableCell>
                      {columns.map((spec) => (
                        <TableCell key={spec.id} className={cn('text-sm', RIGHT.has(spec.id) && 'text-right')}>
                          {spec.render ? spec.render(t) : fieldText(spec, t)}
                        </TableCell>
                      ))}
                    </TableRow>
                    {open && (
                      <TableRow>
                        <TableCell colSpan={columns.length + 1} className="bg-muted/30 py-3 space-y-3">
                          <FieldList fields={TRANSACTION_FIELDS} row={t} />
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => correct.mutate(t.transaction_id)}>
                              Correct
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => reverse.mutate(t.transaction_id)}>
                              Reverse
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {meta && <Pager page={meta.page} pages={meta.pages} total={meta.total} noun="transactions" onPage={(p) => setChosen({ scope, page: p })} />}
    </div>
  )
}
