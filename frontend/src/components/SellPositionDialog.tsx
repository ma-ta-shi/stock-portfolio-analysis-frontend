import { useState, useMemo } from 'react'
import { AlertTriangle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useSellPosition, usePortfolioHoldings } from '@/hooks/use-portfolio'
import { formatCAD, formatPct } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Holding } from '@/types'

// Marginal rate used for tax estimate — in a real app this comes from user Settings
const MARGINAL_RATE = 0.33

interface SellPositionDialogProps {
  holding: Holding | null
  onClose: () => void
}

export function SellPositionDialog({ holding, onClose }: SellPositionDialogProps) {
  const [shares, setShares] = useState(() => holding ? String(holding.shares) : '')
  const [price, setPrice] = useState(() => holding ? String(holding.current_price.toFixed(2)) : '')
  const [fees, setFees] = useState('4.99')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))

  const sellMutation = useSellPosition()
  const { data: allHoldings } = usePortfolioHoldings()

  const sharesNum = parseFloat(shares) || 0
  const priceNum = parseFloat(price) || 0
  const feesNum = parseFloat(fees) || 0

  const isTrading = holding?.account_type === 'trading'

  const preview = useMemo(() => {
    if (!holding || sharesNum <= 0 || priceNum <= 0) return null
    const realizedGainLoss = (priceNum - holding.average_cost_basis) * sharesNum - feesNum
    const bookCost = holding.average_cost_basis * sharesNum
    const realizedGainLossPct = bookCost > 0 ? realizedGainLoss / bookCost : 0

    let taxImpact = null
    if (isTrading && realizedGainLoss > 0) {
      const taxableCapitalGain = realizedGainLoss * 0.5
      taxImpact = {
        capital_gain: realizedGainLoss,
        taxable_capital_gain: taxableCapitalGain,
        estimated_tax: taxableCapitalGain * MARGINAL_RATE,
        marginal_rate: MARGINAL_RATE,
      }
    }

    // Superficial loss: selling at a loss in Trading, and same stock held in TFSA/RRSP
    let superficialLossWarning = false
    let superficialLossDetail: string | null = null
    if (isTrading && realizedGainLoss < 0 && allHoldings) {
      const otherAccounts = allHoldings
        .filter(
          (h) =>
            h.stock.stock_id === holding.stock.stock_id &&
            h.holding_id !== holding.holding_id &&
            h.is_active !== false,
        )
        .map((h) => h.account_type.toUpperCase())
      if (otherAccounts.length > 0) {
        superficialLossWarning = true
        superficialLossDetail = `This stock is also held in your ${otherAccounts.join(' and ')}. If you repurchase within 30 days before or after this sale, the loss will be denied under the superficial loss rule.`
      }
    }

    return { realizedGainLoss, realizedGainLossPct, taxImpact, superficialLossWarning, superficialLossDetail }
  }, [holding, sharesNum, priceNum, feesNum, isTrading, allHoldings])

  async function handleSell() {
    if (!holding || sharesNum <= 0 || priceNum <= 0) return
    await sellMutation.mutateAsync({
      holdingId: holding.holding_id,
      shares: sharesNum,
      pricePerShare: priceNum,
      fees: feesNum,
      transactionDate: new Date(date).toISOString(),
    })
    onClose()
  }

  const maxShares = holding?.shares ?? 0
  const sharesValid = sharesNum > 0 && sharesNum <= maxShares
  const canSell = sharesValid && priceNum > 0

  const gainPositive = preview ? preview.realizedGainLoss >= 0 : true

  return (
    <Dialog open={holding !== null} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Sell {holding?.stock.ticker}
            {holding && (
              <Badge variant="outline" className="ml-2 text-xs font-normal">
                {holding.account_type.toUpperCase()}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Current position */}
        {holding && (
          <div className="grid grid-cols-3 gap-2 rounded-md bg-muted/40 px-3 py-2 text-xs">
            <div>
              <div className="text-muted-foreground">Shares held</div>
              <div className="font-medium">{holding.shares}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Avg cost</div>
              <div className="font-medium">{holding.stock.currency} ${holding.average_cost_basis.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Unrealized</div>
              <div className={cn('font-medium', holding.total_gain_loss >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                {formatCAD(holding.total_gain_loss)}
              </div>
            </div>
          </div>
        )}

        {/* Sell details */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">
                Shares to sell{' '}
                <span className="text-muted-foreground/60">(max {maxShares})</span>
              </label>
              <Input
                type="number"
                min="0"
                max={maxShares}
                step="any"
                value={shares}
                onChange={(e) => setShares(e.target.value)}
                autoFocus
                className={cn(!sharesValid && sharesNum > 0 ? 'border-destructive' : '')}
              />
              {sharesNum > maxShares && (
                <p className="text-xs text-destructive">Cannot exceed {maxShares} shares</p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">
                Price per share ({holding?.stock.currency})
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  className="pl-7"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Transaction date</label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Fees ({holding?.stock.currency})</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  className="pl-7"
                  value={fees}
                  onChange={(e) => setFees(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Realized P&L preview */}
        {preview && sharesValid && priceNum > 0 && (
          <div className="space-y-2">
            <div className={cn(
              'rounded-md px-3 py-2.5 text-sm font-medium text-center',
              gainPositive ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400',
            )}>
              Realized {gainPositive ? 'gain' : 'loss'}:{' '}
              {gainPositive ? '+' : ''}
              {formatCAD(preview.realizedGainLoss)}{' '}
              ({gainPositive ? '+' : ''}{formatPct(preview.realizedGainLossPct * 100)})
            </div>

            {/* Tax implications (Trading only) */}
            {preview.taxImpact && (
              <div className="rounded-md bg-muted/40 px-3 py-2 text-xs space-y-0.5">
                <div className="font-medium text-muted-foreground mb-1">Tax implications (Trading account)</div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Realized gain</span>
                  <span>{formatCAD(preview.taxImpact.capital_gain)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Taxable capital gain (50% inclusion)</span>
                  <span>{formatCAD(preview.taxImpact.taxable_capital_gain)}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-muted-foreground">Estimated tax ({Math.round(preview.taxImpact.marginal_rate * 100)}% marginal rate)</span>
                  <span>~{formatCAD(preview.taxImpact.estimated_tax)}</span>
                </div>
              </div>
            )}

            {/* Superficial loss warning */}
            {preview.superficialLossWarning && preview.superficialLossDetail && (
              <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{preview.superficialLossDetail}</span>
              </div>
            )}

            {sharesNum >= maxShares && (
              <p className="text-xs text-muted-foreground text-center">
                Selling all shares — this position will be closed.
              </p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={handleSell}
            disabled={!canSell || sellMutation.isPending}
          >
            {sellMutation.isPending ? 'Processing…' : `Sell ${sharesValid && sharesNum > 0 ? sharesNum : ''} shares`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
