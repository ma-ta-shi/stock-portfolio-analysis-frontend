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
import { formatCAD, formatPct } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Holding } from '@/types'

function pctDisplay(value: number) {
  return value > 0 ? `${(value * 100).toFixed(2)}%` : '—'
}

interface HoldingsTableProps {
  accountFilter?: string
}

export function HoldingsTable({ accountFilter }: HoldingsTableProps) {
  const navigate = useNavigate()
  const { data: allHoldings, isLoading, isError, refetch } = usePortfolioHoldings()
  const removeFromPortfolio = useRemoveFromPortfolio()
  const [editingHolding, setEditingHolding] = useState<Holding | null>(null)
  const [buyingHolding, setBuyingHolding] = useState<Holding | null>(null)
  const [sellingHolding, setSellingHolding] = useState<Holding | null>(null)
  const [removingHolding, setRemovingHolding] = useState<Holding | null>(null)

  const holdings = useMemo(
    () =>
      accountFilter && accountFilter !== 'combined'
        ? allHoldings?.filter((h) => h.account_type === accountFilter)
        : allHoldings,
    [allHoldings, accountFilter],
  )

  async function handleConfirmRemove() {
    if (!removingHolding) return
    await removeFromPortfolio.mutateAsync(removingHolding.holding_id)
    setRemovingHolding(null)
  }

  if (isLoading) {
    return <div className="h-48 rounded-lg bg-muted animate-pulse" />
  }
  if (isError) {
    return (
      <div className="border border-border rounded-lg p-8 text-center space-y-3">
        <p className="text-sm text-muted-foreground">Failed to load holdings.</p>
        <Button size="sm" variant="outline" onClick={() => refetch()}>Retry</Button>
      </div>
    )
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
              const gainPositive = h.total_gain_loss >= 0
              const canRemove = (h.transaction_count ?? 1) === 0
              return (
                <TableRow
                  key={h.holding_id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/stocks/${h.stock.stock_id}`)}
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
                    {h.average_cost_basis.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {h.current_price.toFixed(2)}{' '}
                    <span className="text-xs text-muted-foreground">{h.stock.currency}</span>
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium">
                    {formatCAD(h.market_value)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div
                      className={cn(
                        'text-sm font-medium',
                        gainPositive ? 'text-emerald-600' : 'text-red-600',
                      )}
                    >
                      {formatCAD(h.total_gain_loss)}
                    </div>
                    <div
                      className={cn(
                        'text-xs',
                        gainPositive ? 'text-emerald-600' : 'text-red-600',
                      )}
                    >
                      {formatPct(h.total_gain_loss_pct * 100)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <OutlookBadge direction={h.stock_outlook} />
                  </TableCell>
                  <TableCell>
                    <ConfidenceMeter score={h.confidence_score} />
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {pctDisplay(h.annual_dividend_yield)}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {pctDisplay(h.yield_on_cost)}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-emerald-600"
                        title="Buy more shares"
                        onClick={() => setBuyingHolding(h)}
                      >
                        <TrendingUp className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-red-600"
                        title="Sell shares"
                        onClick={() => setSellingHolding(h)}
                      >
                        <TrendingDown className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-foreground"
                        title="Edit position"
                        onClick={() => setEditingHolding(h)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      {canRemove && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-destructive"
                          title="Remove (no transactions)"
                          onClick={() => setRemovingHolding(h)}
                        >
                          <Trash2 className="w-4 h-4" />
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
