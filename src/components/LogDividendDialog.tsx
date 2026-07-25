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
import { useLogDividend } from '@/hooks/use-portfolio'
import { formatCAD } from '@/lib/utils'
import type { Holding } from '@/types'

interface LogDividendDialogProps {
  holding: Holding | null
  onClose: () => void
}

export function LogDividendDialog({ holding, onClose }: LogDividendDialogProps) {
  const [amountPerShare, setAmountPerShare] = useState(
    () => holding?.annual_dividend_per_share
      ? String((holding.annual_dividend_per_share / 4).toFixed(4))
      : '',
  )
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [isDrip, setIsDrip] = useState(false)
  const [dripPrice, setDripPrice] = useState(() => holding ? String(holding.current_price.toFixed(2)) : '')

  const logDividend = useLogDividend()

  const amountPerShareNum = parseFloat(amountPerShare) || 0
  const dripPriceNum = parseFloat(dripPrice) || 0
  const totalAmount = holding ? amountPerShareNum * holding.shares : 0
  const dripShares = isDrip && dripPriceNum > 0 ? Math.floor(totalAmount / dripPriceNum) : 0
  const canSave = amountPerShareNum > 0 && totalAmount > 0

  async function handleSave() {
    if (!holding || !canSave) return
    await logDividend.mutateAsync({
      holdingId: holding.holding_id,
      totalAmount,
      amountPerShare: amountPerShareNum,
      paymentDate: new Date(paymentDate).toISOString(),
      isDrip,
      dripShares: isDrip ? dripShares : undefined,
      dripPricePerShare: isDrip && dripPriceNum > 0 ? dripPriceNum : undefined,
    })
    onClose()
  }

  return (
    <Dialog open={holding !== null} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            Log Dividend — {holding?.stock.ticker}
            {holding && (
              <Badge variant="outline" className="ml-2 text-xs font-normal">
                {holding.account_type.toUpperCase()}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {holding && (
          <div className="grid grid-cols-2 gap-2 rounded-md bg-muted/40 px-3 py-2 text-xs">
            <div>
              <div className="text-muted-foreground">Shares held</div>
              <div className="font-medium">{holding.shares}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Annual div/share</div>
              <div className="font-medium">
                {holding.annual_dividend_per_share > 0
                  ? `$${holding.annual_dividend_per_share.toFixed(4)}`
                  : '—'}
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">
                Amount per share ({holding?.stock.currency})
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  className="pl-7"
                  value={amountPerShare}
                  onChange={(e) => setAmountPerShare(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Payment date</label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
          </div>

          {canSave && (
            <div className="rounded-md bg-muted/40 px-3 py-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total dividend</span>
                <span className="font-medium">{formatCAD(totalAmount)}</span>
              </div>
            </div>
          )}

          {/* DRIP toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isDrip}
              onChange={(e) => setIsDrip(e.target.checked)}
              className="rounded border-border"
            />
            <span className="text-sm">DRIP — reinvest as new shares</span>
          </label>

          {isDrip && (
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">
                Reinvestment price per share ({holding?.stock.currency})
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  className="pl-7"
                  value={dripPrice}
                  onChange={(e) => setDripPrice(e.target.value)}
                />
              </div>
              {dripShares > 0 && (
                <p className="text-xs text-muted-foreground">
                  {dripShares} shares will be added at ${dripPriceNum.toFixed(2)}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!canSave || logDividend.isPending}>
            {logDividend.isPending ? 'Saving…' : 'Log Dividend'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
