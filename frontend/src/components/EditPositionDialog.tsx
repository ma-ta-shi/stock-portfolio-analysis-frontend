import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useUpdatePosition } from '@/hooks/use-portfolio'
import type { Holding } from '@/types'

interface EditPositionDialogProps {
  holding: Holding | null
  onClose: () => void
}

export function EditPositionDialog({ holding, onClose }: EditPositionDialogProps) {
  const [shares, setShares] = useState(() => holding ? String(holding.shares) : '')
  const [avgCost, setAvgCost] = useState(() => holding ? String(holding.average_cost_basis) : '')
  const update = useUpdatePosition()

  async function handleSave() {
    if (!holding) return
    const sharesNum = parseFloat(shares)
    const avgCostNum = parseFloat(avgCost)
    if (!sharesNum || !avgCostNum) return
    await update.mutateAsync({ holdingId: holding.holding_id, shares: sharesNum, average_cost_basis: avgCostNum })
    onClose()
  }

  const sharesNum = parseFloat(shares)
  const avgCostNum = parseFloat(avgCost)
  const canSave = sharesNum > 0 && avgCostNum > 0

  return (
    <Dialog open={holding !== null} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Position — {holding?.stock.ticker}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Shares</label>
              <Input
                type="number"
                min="0"
                step="any"
                value={shares}
                onChange={(e) => setShares(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Avg cost ({holding?.stock.currency})</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  className="pl-7"
                  value={avgCost}
                  onChange={(e) => setAvgCost(e.target.value)}
                />
              </div>
            </div>
          </div>
          {sharesNum > 0 && avgCostNum > 0 && (
            <p className="text-xs text-muted-foreground">
              Book cost:{' '}
              {holding?.stock.currency} ${(sharesNum * avgCostNum).toLocaleString('en-CA', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!canSave || update.isPending}>
            {update.isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
