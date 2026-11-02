import { useId, useMemo } from 'react'
import { Download, X } from 'lucide-react'
import { useTransactions } from '@/hooks/use-portfolio'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { QueryError } from '@/components/QueryError'
import { useTransactionFilters } from '@/hooks/use-transaction-filters'
import { downloadFile, toCsv } from '@/lib/csv'
import { formatDate, formatMoney, formatPct, localDateInputValue } from '@/lib/format'
import { gainLossColor, TONE_TEXT } from '@/lib/labels'
import { filterByAccount } from '@/lib/portfolio'
import {
  filterTransactions,
  isDateRangeInvalid,
  tickersIn,
  TX_TYPE_FILTERS,
} from '@/lib/transactions'
import { cn } from '@/lib/utils'
import type { PortfolioAccountView, TransactionType } from '@/types'

const FILTER_CONTROL =
  'h-8 rounded-md border border-border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary'

const TX_TYPE_LABELS: Record<TransactionType, string> = {
  buy: 'Buy',
  sell: 'Sell',
  dividend: 'Dividend',
  drip: 'DRIP',
  transfer_in: 'Transfer In',
  transfer_out: 'Transfer Out',
}

const TX_TYPE_VARIANTS: Record<TransactionType, string> = {
  buy: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400',
  sell: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400',
  dividend: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400',
  drip: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400',
  transfer_in: 'bg-muted text-muted-foreground',
  transfer_out: 'bg-muted text-muted-foreground',
}

interface TransactionsTabProps {
  accountFilter?: PortfolioAccountView
}

export function TransactionsTab({ accountFilter }: TransactionsTabProps) {
  const { data: allTransactions, isLoading, isError, error, refetch } = useTransactions()
  const { filters, setFilters, clearFilters, isFiltered } = useTransactionFilters()
  const fieldId = useId()

  // A single position's history ignores the account switcher: the position belongs to
  // exactly one account, and hiding it because another account is selected would be confusing.
  const scoped = useMemo(
    () => (filters.holdingId ? (allTransactions ?? []) : (filterByAccount(allTransactions, accountFilter) ?? [])),
    [allTransactions, accountFilter, filters.holdingId],
  )
  const transactions = useMemo(() => filterTransactions(scoped, filters), [scoped, filters])
  const tickers = useMemo(() => tickersIn(scoped), [scoped])
  const holdingTx = filters.holdingId
    ? allTransactions?.find((t) => t.holding_id === filters.holdingId)
    : undefined
  const dateRangeInvalid = isDateRangeInvalid(filters)

  function handleExportCSV() {
    if (!transactions.length) return
    const headers = ['Date', 'Ticker', 'Account', 'Type', 'Currency', 'Shares', 'Price', 'Total', 'Fees', 'Realized P&L', 'Notes']
    const rows = transactions.map((t) => [
      t.transaction_date.slice(0, 10), // ISO date sorts and imports cleanly in spreadsheets
      t.stock.ticker,
      t.account_type.toUpperCase(),
      TX_TYPE_LABELS[t.transaction_type],
      t.currency,
      t.shares ?? '',
      t.price_per_share.toFixed(2),
      t.total_amount.toFixed(2),
      t.fees.toFixed(2),
      t.realized_gain_loss?.toFixed(2) ?? '',
      t.notes ?? '',
    ])
    downloadFile(toCsv([headers, ...rows]), `transactions-${localDateInputValue()}.csv`)
  }

  if (isLoading) {
    return <div className="h-48 rounded-lg bg-muted animate-pulse" />
  }
  if (isError) {
    return <QueryError what="transactions" error={error} onRetry={refetch} />
  }

  return (
    <div>
      {filters.holdingId && (
        <div className="flex items-center justify-between gap-2 mb-3 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
          <span>
            Showing full history for{' '}
            <span className="font-medium">
              {holdingTx ? `${holdingTx.stock.ticker} (${holdingTx.account_type.toUpperCase()})` : 'one position'}
            </span>
          </span>
          <Button size="sm" variant="ghost" onClick={() => setFilters({ holdingId: null })}>
            Show all transactions
          </Button>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-end justify-between mb-3 flex-wrap gap-3">
        <div className="flex items-end gap-3 flex-wrap">
          <div role="group" aria-label="Transaction type" className="flex gap-1.5 flex-wrap">
            {TX_TYPE_FILTERS.map((type) => (
              <button
                type="button"
                key={type}
                aria-pressed={filters.type === type}
                onClick={() => setFilters({ type })}
                className={cn(
                  'px-2.5 py-1 text-xs rounded-md border transition-colors h-8',
                  filters.type === type
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-muted-foreground hover:bg-muted',
                )}
              >
                {type === 'all' ? 'All' : TX_TYPE_LABELS[type as TransactionType]}
              </button>
            ))}
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
        <Button size="sm" variant="outline" onClick={handleExportCSV} disabled={!transactions.length}>
          <Download className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
          Export CSV
        </Button>
      </div>

      {dateRangeInvalid && (
        <p role="alert" className="text-xs text-destructive mb-3">
          The “From” date is after the “To” date.
        </p>
      )}

      {!transactions.length ? (
        <p className="text-muted-foreground text-sm py-8 text-center">
          {isFiltered ? 'No transactions match these filters.' : 'No transactions yet.'}
        </p>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Shares</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Fees</TableHead>
                <TableHead className="text-right">Realized P&L</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((t) => {
                const gainClass = gainLossColor(t.realized_gain_loss ?? 0)
                return (
                  <TableRow key={t.transaction_id}>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(t.transaction_date)}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{t.stock.ticker}</div>
                      <div className="text-xs text-muted-foreground">{t.stock.name}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {t.account_type.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium',
                          TX_TYPE_VARIANTS[t.transaction_type],
                        )}
                      >
                        {TX_TYPE_LABELS[t.transaction_type]}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {t.shares != null ? (
                        <span className={t.shares < 0 ? TONE_TEXT.negative : undefined}>
                          {t.shares > 0 ? '+' : ''}{t.shares}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {formatMoney(t.price_per_share, t.currency)}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {formatMoney(t.total_amount, t.currency)}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {t.fees > 0 ? formatMoney(t.fees, t.currency) : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {t.realized_gain_loss != null ? (
                        <>
                          <div className={cn('text-sm font-medium', gainClass)}>
                            {formatMoney(t.realized_gain_loss, t.currency, { signed: true })}
                          </div>
                          {t.realized_gain_loss_pct != null && (
                            <div className={cn('text-xs', gainClass)}>
                              {formatPct(t.realized_gain_loss_pct)}
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
