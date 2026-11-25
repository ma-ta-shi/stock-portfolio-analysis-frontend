/**
 * The Holdings tab. Columns and the expanded detail come from the field registry (`screens/portfolio/holdings.tsx`), so every
 * API field the page can reach is either a column, a detail line, or listed there as not shown. The write buttons open the
 * existing dialogs, which show the not-connected error until the writes ticket (86bd5z6mq) wires them.
 */
import { Fragment, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronRight, DollarSign, Pencil, Trash2, TrendingDown, TrendingUp } from 'lucide-react'
import { usePortfolioHoldings, useRemoveFromPortfolio } from '@/hooks/use-portfolio'
import { EditPositionDialog } from '@/components/EditPositionDialog'
import { SellPositionDialog } from '@/components/SellPositionDialog'
import { BuySharesDialog } from '@/components/BuySharesDialog'
import { LogDividendDialog } from '@/components/LogDividendDialog'
import { FieldList } from '@/components/FieldList'
import { ClosedPositions } from './ClosedPositions'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { QueryError } from '@/components/QueryError'
import { getErrorMessage } from '@/lib/api'
import { clickableRowProps } from '@/lib/a11y'
import { fieldText, fieldsFor } from '@/lib/fields'
import { filterByAccount } from '@/lib/portfolio'
import { cn } from '@/lib/utils'
import { HOLDING_FIELDS } from '@/screens/portfolio/holdings'
import type { Holding, PortfolioAccountView } from '@/types/portfolio'

/** Columns of figures, aligned right. */
const RIGHT = new Set(['shares', 'average_cost', 'price', 'market_value', 'gain', 'dividend_yield', 'yield_on_cost'])

interface HoldingsTableProps {
  accountFilter?: PortfolioAccountView
}

export function HoldingsTable({ accountFilter }: HoldingsTableProps) {
  const navigate = useNavigate()
  const { data: allHoldings, isLoading, isError, error, refetch } = usePortfolioHoldings()
  const removeFromPortfolio = useRemoveFromPortfolio()
  const [editingHolding, setEditingHolding] = useState<Holding | null>(null)
  const [buyingHolding, setBuyingHolding] = useState<Holding | null>(null)
  const [sellingHolding, setSellingHolding] = useState<Holding | null>(null)
  const [dividendHolding, setDividendHolding] = useState<Holding | null>(null)
  const [removingHolding, setRemovingHolding] = useState<Holding | null>(null)
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

  async function handleConfirmRemove() {
    if (!removingHolding) return
    try {
      await removeFromPortfolio.mutateAsync(removingHolding.holding_id)
      setRemovingHolding(null)
    } catch {
      // Shown from removeFromPortfolio.error in the dialog.
    }
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
                          onClick={() => setBuyingHolding(h)}
                        >
                          <TrendingUp className="w-4 h-4" aria-hidden="true" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-red-600 dark:hover:text-red-400"
                          title="Sell shares"
                          aria-label={`Sell ${label}`}
                          onClick={() => setSellingHolding(h)}
                        >
                          <TrendingDown className="w-4 h-4" aria-hidden="true" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-blue-600"
                          title="Log dividend"
                          aria-label={`Log dividend for ${label}`}
                          onClick={() => setDividendHolding(h)}
                        >
                          <DollarSign className="w-4 h-4" aria-hidden="true" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-foreground"
                          title="Edit position"
                          aria-label={`Edit ${label}`}
                          onClick={() => setEditingHolding(h)}
                        >
                          <Pencil className="w-4 h-4" aria-hidden="true" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-destructive"
                          title="Remove"
                          aria-label={`Remove ${label}`}
                          onClick={() => setRemovingHolding(h)}
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {open && (
                    <TableRow>
                      <TableCell colSpan={columns.length + 2} className="bg-muted/30 py-3">
                        <FieldList fields={HOLDING_FIELDS} row={h} />
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

      <EditPositionDialog key={editingHolding?.holding_id ?? 'none'} holding={editingHolding} onClose={() => setEditingHolding(null)} />
      <BuySharesDialog key={buyingHolding?.holding_id ?? 'none-buy'} holding={buyingHolding} onClose={() => setBuyingHolding(null)} />
      <LogDividendDialog key={dividendHolding?.holding_id ?? 'none-div'} holding={dividendHolding} onClose={() => setDividendHolding(null)} />
      <SellPositionDialog key={sellingHolding?.holding_id ?? 'none-sell'} holding={sellingHolding} onClose={() => setSellingHolding(null)} />

      <Dialog
        open={removingHolding !== null}
        onOpenChange={(open) => {
          if (!open) setRemovingHolding(null)
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove from Portfolio</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Remove <span className="font-medium text-foreground">{removingHolding?.stock.ticker}</span> ({removingHolding?.account_type.toUpperCase()}) from your portfolio?
          </p>
          {removeFromPortfolio.isError && (
            <p role="alert" className="text-xs text-destructive">
              {getErrorMessage(removeFromPortfolio.error)}
            </p>
          )}
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setRemovingHolding(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmRemove} disabled={removeFromPortfolio.isPending}>
              {removeFromPortfolio.isPending ? 'Removing…' : 'Remove'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
