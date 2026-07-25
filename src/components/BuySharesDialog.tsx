import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useBuyShares } from '@/hooks/use-portfolio'
import { formatCAD } from '@/lib/utils'
import type { Holding } from '@/types'

interface BuySharesDialogProps {
  holding: Holding | null
  onClose: () => void
}

export function BuySharesDialog({ holding, onClose }: BuySharesDialogProps) {
  const [shares, setShares] = useState('')
  const [price, setPrice] = useState(() => holding ? String(holding.current_price.toFixed(2)) : '')
  const [fees, setFees] = useState('4.99')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))

  const buyMutation = useBuyShares()

  const sharesNum = parseFloat(shares) || 0
  const priceNum = parseFloat(price) || 0
  const feesNum = parseFloat(fees) || 0
  const canBuy = sharesNum > 0 && priceNum > 0

  // Preview: new weighted-average cost and new total shares
  const newTotalShares = holding ? holding.shares + sharesNum : sharesNum
  const newBookCost = holding
    ? holding.shares * holding.average_cost_basis + sharesNum * priceNum
    : sharesNum * priceNum
  const newAvgCost = newTotalShares > 0 ? newBookCost / newTotalShares : 0

  async function handleBuy() {
    if (!holding || !canBuy) return
    await buyMutation.mutateAsync({
      holdingId: holding.holding_id,
      shares: sharesNum,
      pricePerShare: priceNum,
      fees: feesNum,
      transactionDate: new Date(date).toISOString(),
    })
    onClose()
  }

  return (
    <Dialog open={holding !== null} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            Buy {holding?.stock.ticker}
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
              <div className="font-medium">${holding.average_cost_basis.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Book cost</div>
              <div className="font-medium">
                {formatCAD(holding.shares * holding.average_cost_basis)}
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Shares to buy</label>
              <Input
                type="number"
                min="0"
                step="any"
                placeholder="e.g. 25"
                value={shares}
                onChange={(e) => setShares(e.target.value)}
                autoFocus
              />
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
              <label className="text-xs text-muted-foreground">
                Fees ({holding?.stock.currency})
              </label>
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

        {/* Preview */}
        {canBuy && holding && (
          <div className="rounded-md bg-muted/40 px-3 py-2 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">This purchase</span>
              <span className="font-medium">{formatCAD(sharesNum * priceNum)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">New total shares</span>
              <span className="font-medium">{newTotalShares}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">New avg cost</span>
              <span className="font-medium">${newAvgCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">New book cost</span>
              <span className="font-medium">{formatCAD(newBookCost)}</span>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleBuy} disabled={!canBuy || buyMutation.isPending}>
            {buyMutation.isPending ? 'Processing…' : 'Buy shares'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
