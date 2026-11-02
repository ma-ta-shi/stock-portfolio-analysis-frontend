import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pencil, Trash2, TrendingDown, TrendingUp } from 'lucide-react'
import { usePortfolioHoldings, useRemoveFromPortfolio } from '@/hooks/use-portfolio'
import { OutlookBadge } from '@/components/OutlookBadge'
import { ConfidenceMeter } from '@/components/ConfidenceMeter'
import { EditPositionDialog } from '@/components/EditPositionDialog'
import { SellPositionDialog } from '@/components/SellPositionDialog'
import { BuySharesDialog } from '@/components/BuySharesDialog'
import { ClosedPositions } from './ClosedPositions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { QueryError } from '@/components/QueryError'
import { getErrorMessage } from '@/lib/api'
import { clickableRowProps } from '@/lib/a11y'
import { formatMoney, formatNumber, formatPct, formatPercent } from '@/lib/format'
import { gainLossColor } from '@/lib/labels'
import { filterByAccount } from '@/lib/portfolio'
import { cn } from '@/lib/utils'
import type { Holding, PortfolioAccountView } from '@/types'

/** Yield-style percentage, or "—" when there's no dividend. */
function yieldDisplay(value: number) {
  return value > 0 ? formatPercent(value) : '—'
}

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
  const [removingHolding, setRemovingHolding] = useState<Holding | null>(null)

  const holdings = useMemo(() => filterByAccount(allHoldings, accountFilter), [allHoldings, accountFilter])

  async function handleConfirmRemove() {
    if (!removingHolding) return
    try {
      await removeFromPortfolio.mutateAsync(removingHolding.holding_id)
      setRemovingHolding(null)
    } catch {
      // Shown from removeFromPortfolio.error in the dialog.
    }
  }

  if (isLoading) {
    return <div className="h-48 rounded-lg bg-muted animate-pulse" />
  }
  if (isError) {
    return <QueryError what="holdings" error={error} onRetry={refetch} />
  }
  if (!holdings?.length) {
    return (
      <>
        <p className="text-muted-foreground text-sm py-8 text-center">No holdings found.</p>
        <ClosedPositions />
      </>
    )
  }

  return (
    <>
      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Stock</TableHead>
              <TableHead>Account</TableHead>
              <TableHead className="text-right">Shares</TableHead>
              <TableHead className="text-right">Avg Cost</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Market Value</TableHead>
              <TableHead className="text-right">Gain / Loss</TableHead>
              <TableHead>Outlook</TableHead>
              <TableHead>Confidence</TableHead>
              <TableHead className="text-right">Div Yield</TableHead>
              <TableHead className="text-right">YoC</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {holdings.map((h) => {
              const currency = h.stock.currency
              const gainClass = gainLossColor(h.total_gain_loss)
              const canRemove = (h.transaction_count ?? 1) === 0
              const label = `${h.stock.ticker} (${h.account_type.toUpperCase()})`
              return (
                <TableRow
                  key={h.holding_id}
                  {...clickableRowProps(() => navigate(`/stocks/${h.stock.stock_id}`), `View ${h.stock.ticker}`)}
                >
                  <TableCell>
                    <div className="font-medium">{h.stock.ticker}</div>
                    <div className="text-xs text-muted-foreground">{h.stock.name}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {h.account_type.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm">{h.shares}</TableCell>
                  <TableCell className="text-right text-sm">
                    {formatNumber(h.average_cost_basis)}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {formatNumber(h.current_price)}{' '}
                    <span className="text-xs text-muted-foreground">{currency}</span>
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium">
                    {formatMoney(h.market_value, currency)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className={cn('text-sm font-medium', gainClass)}>
                      {formatMoney(h.total_gain_loss, currency, { signed: true })}
                    </div>
                    <div className={cn('text-xs', gainClass)}>
                      {formatPct(h.total_gain_loss_pct)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <OutlookBadge direction={h.stock_outlook} />
                  </TableCell>
                  <TableCell>
                    <ConfidenceMeter score={h.confidence_score} />
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {yieldDisplay(h.annual_dividend_yield)}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {yieldDisplay(h.yield_on_cost)}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-emerald-600"
                        title="Buy more shares"
                        aria-label={`Buy more ${label}`}
                        onClick={() => setBuyingHolding(h)}
                      >
                        <TrendingUp className="w-4 h-4" aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-red-600"
                        title="Sell shares"
                        aria-label={`Sell ${label}`}
                        onClick={() => setSellingHolding(h)}
                      >
                        <TrendingDown className="w-4 h-4" aria-hidden="true" />
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
                      {canRemove && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-destructive"
                          title="Remove (no transactions)"
                        aria-label={`Remove ${label}`}
                          onClick={() => setRemovingHolding(h)}
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Closed positions collapsible section */}
      <ClosedPositions />

      <EditPositionDialog
        key={editingHolding?.holding_id ?? 'none'}
        holding={editingHolding}
        onClose={() => setEditingHolding(null)}
      />

      <BuySharesDialog
        key={buyingHolding?.holding_id ?? 'none-buy'}
        holding={buyingHolding}
        onClose={() => setBuyingHolding(null)}
      />

      <SellPositionDialog
        key={sellingHolding?.holding_id ?? 'none-sell'}
        holding={sellingHolding}
        onClose={() => setSellingHolding(null)}
      />

      <Dialog open={removingHolding !== null} onOpenChange={(open) => { if (!open) setRemovingHolding(null) }}>
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
            <Button variant="outline" onClick={() => setRemovingHolding(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleConfirmRemove}
              disabled={removeFromPortfolio.isPending}
            >
              {removeFromPortfolio.isPending ? 'Removing…' : 'Remove'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
