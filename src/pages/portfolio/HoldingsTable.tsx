/**
 * The Holdings tab. Columns and the expanded detail come from the field registry (`screens/portfolio/holdings.tsx`), so every
 * API field the page can reach is either a column, a detail line, or listed there as not shown. The row buttons open the dialogs
 * of `useHoldingActions`; Buy and Sell record through the ledger shell, the others are connected in the next PRs.
 */
import { Fragment, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronRight, DollarSign, Pencil, Trash2, TrendingDown, TrendingUp } from 'lucide-react'
import { usePortfolioHoldings } from '@/hooks/use-portfolio'
import { useHoldingActions } from '@/hooks/use-holding-actions'
import { HoldingActionDialogs } from '@/components/ledger/HoldingActionDialogs'
import { FieldList } from '@/components/FieldList'
import { ClosedPositions } from './ClosedPositions'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { QueryError } from '@/components/QueryError'
import { clickableRowProps } from '@/lib/a11y'
import { fieldText, fieldsFor } from '@/lib/fields'
import { filterByAccount } from '@/lib/portfolio'
import { cn } from '@/lib/utils'
import { HOLDING_FIELDS } from '@/screens/portfolio/holdings'
import type { PortfolioAccountView } from '@/types/portfolio'

/** Columns of figures, aligned right. */
const RIGHT = new Set(['shares', 'average_cost', 'price', 'market_value', 'gain', 'dividend_yield', 'yield_on_cost'])

interface HoldingsTableProps {
  accountFilter?: PortfolioAccountView
}

export function HoldingsTable({ accountFilter }: HoldingsTableProps) {
  const navigate = useNavigate()
  const { data: allHoldings, isLoading, isError, error, refetch } = usePortfolioHoldings()
  const actions = useHoldingActions()
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set())

  const holdings = useMemo(() => filterByAccount(allHoldings, accountFilter), [allHoldings, accountFilter])
  const columns = useMemo(() => fieldsFor(HOLDING_FIELDS, 'column'), [])

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (!next.delete(id)) next.add(id)
      return next
    })
  }

  if (isLoading) return <div className="h-48 rounded-lg bg-muted animate-pulse" />
  if (isError) return <QueryError what="holdings" error={error} onRetry={refetch} />
  if (!holdings?.length) {
    return (
      <>
        <p className="text-muted-foreground text-sm py-8 text-center">No holdings found.</p>
        <ClosedPositions accountFilter={accountFilter} />
      </>
    )
  }

  return (
    <>
      <div className="border border-border rounded-lg overflow-hidden">
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
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {holdings.map((h) => {
              const label = `${h.stock.ticker} (${h.account_type.toUpperCase()})`
              const open = expanded.has(h.holding_id)
              return (
                <Fragment key={h.holding_id}>
                  <TableRow {...clickableRowProps(() => navigate(`/stocks/${h.stock.stock_id}`), `View ${h.stock.ticker}`)}>
                    <TableCell onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-expanded={open}
                        aria-label={`${open ? 'Hide' : 'Show'} details of ${label}`}
                        onClick={() => toggle(h.holding_id)}
                      >
                        {open ? <ChevronDown className="w-4 h-4" aria-hidden="true" /> : <ChevronRight className="w-4 h-4" aria-hidden="true" />}
                      </Button>
                    </TableCell>
                    {columns.map((spec) => (
                      <TableCell key={spec.id} className={cn('text-sm', RIGHT.has(spec.id) && 'text-right')}>
                        {spec.render ? spec.render(h) : fieldText(spec, h)}
                      </TableCell>
                    ))}
                    <TableCell onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-emerald-700 dark:hover:text-emerald-400"
                          title="Buy more shares"
                          aria-label={`Buy more ${label}`}
                          onClick={() => actions.open('buy', h)}
                        >
                          <TrendingUp className="w-4 h-4" aria-hidden="true" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-red-600 dark:hover:text-red-400"
                          title="Sell shares"
                          aria-label={`Sell ${label}`}
                          onClick={() => actions.open('sell', h)}
                        >
                          <TrendingDown className="w-4 h-4" aria-hidden="true" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-foreground"
                          title="Edit position"
                          aria-label={`Edit ${label}`}
                          onClick={() => actions.open('edit', h)}
                        >
                          <Pencil className="w-4 h-4" aria-hidden="true" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {open && (
                    <TableRow>
                      <TableCell colSpan={columns.length + 2} className="bg-muted/30 py-3">
                        <FieldList fields={HOLDING_FIELDS} row={h} />
                        <div role="group" aria-label={`Actions for ${label}`} className="mt-3 flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => actions.open('dividend', h)}>
                            <DollarSign className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                            Log dividend
                          </Button>
                          <Button size="sm" variant="outline" className="text-destructive" onClick={() => actions.open('remove', h)}>
                            <Trash2 className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                            Remove
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

      <ClosedPositions accountFilter={accountFilter} />
      <HoldingActionDialogs actions={actions} />
    </>
  )
}
