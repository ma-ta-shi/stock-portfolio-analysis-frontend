import { useState, type FormEvent } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/FormField'
import { MoneyInput } from '@/components/MoneyInput'
import { useUpdatePosition } from '@/hooks/use-portfolio'
import { getErrorMessage } from '@/lib/api'
import { formatMoney, parseAmount } from '@/lib/format'
import type { Holding } from '@/types'

interface EditPositionDialogProps {
  holding: Holding | null
  onClose: () => void
}

export function EditPositionDialog({ holding, onClose }: EditPositionDialogProps) {
  const [shares, setShares] = useState(() => (holding ? String(holding.shares) : ''))
  const [avgCost, setAvgCost] = useState(() => (holding ? String(holding.average_cost_basis) : ''))
  const update = useUpdatePosition()

  const sharesNum = parseAmount(shares)
  const avgCostNum = parseAmount(avgCost)
  const canSave = holding !== null && sharesNum > 0 && avgCostNum > 0
  const currency = holding?.stock.currency ?? 'CAD'

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!holding || !canSave) return
    try {
      await update.mutateAsync({
        holdingId: holding.holding_id,
        shares: sharesNum,
        average_cost_basis: avgCostNum,
      })
      onClose()
    } catch {
      // Error is shown from update.error below; keep the dialog open.
    }
  }

  return (
    <Dialog open={holding !== null} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Position — {holding?.stock.ticker}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Shares">
              {(id) => (
                <Input
                  id={id}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  value={shares}
                  onChange={(e) => setShares(e.target.value)}
                  autoFocus
                />
              )}
            </FormField>
            <FormField label={`Avg cost (${currency})`}>
              {(id) => <MoneyInput id={id} value={avgCost} onChange={(e) => setAvgCost(e.target.value)} />}
            </FormField>
          </div>
          {canSave && (
            <p className="text-xs text-muted-foreground">
              Book cost: {formatMoney(sharesNum * avgCostNum, currency)}
            </p>
          )}
          {update.isError && (
            <p role="alert" className="text-xs text-destructive">
              {getErrorMessage(update.error)}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={!canSave || update.isPending}>
              {update.isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
