import { useState, type FormEvent } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { FormField } from '@/components/FormField'
import { MoneyInput } from '@/components/MoneyInput'
import { useBuyShares } from '@/hooks/use-portfolio'
import { getErrorMessage } from '@/lib/api'
import { formatMoney, localDateInputValue, parseAmount } from '@/lib/format'
import type { Holding } from '@/types'

const DEFAULT_FEE = '4.99'

interface BuySharesDialogProps {
  holding: Holding | null
  onClose: () => void
}

export function BuySharesDialog({ holding, onClose }: BuySharesDialogProps) {
  const [shares, setShares] = useState('')
  const [price, setPrice] = useState(() => (holding ? holding.current_price.toFixed(2) : ''))
  const [fees, setFees] = useState(DEFAULT_FEE)
  const [date, setDate] = useState(() => localDateInputValue())

  const buyMutation = useBuyShares()

  const sharesNum = parseAmount(shares)
  const priceNum = parseAmount(price)
  const feesNum = parseAmount(fees)
  const canBuy = holding !== null && sharesNum > 0 && priceNum > 0 && date !== ''
  const currency = holding?.stock.currency ?? 'CAD'

  // Preview: new weighted-average cost and new total shares
  const currentBookCost = holding ? holding.shares * holding.average_cost_basis : 0
  const newTotalShares = (holding?.shares ?? 0) + sharesNum
  const newBookCost = currentBookCost + sharesNum * priceNum
  const newAvgCost = newTotalShares > 0 ? newBookCost / newTotalShares : 0

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!holding || !canBuy) return
    try {
      await buyMutation.mutateAsync({
        holdingId: holding.holding_id,
        shares: sharesNum,
        pricePerShare: priceNum,
        fees: feesNum,
        transactionDate: new Date(date).toISOString(),
      })
      onClose()
    } catch {
      // Error is shown from buyMutation.error below; keep the dialog open.
    }
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

        {holding && (
          <dl className="grid grid-cols-3 gap-2 rounded-md bg-muted/40 px-3 py-2 text-xs">
            <div>
              <dt className="text-muted-foreground">Shares held</dt>
              <dd className="font-medium">{holding.shares}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Avg cost</dt>
              <dd className="font-medium">{formatMoney(holding.average_cost_basis, currency)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Book cost</dt>
              <dd className="font-medium">{formatMoney(currentBookCost, currency)}</dd>
            </div>
          </dl>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Shares to buy">
              {(id) => (
                <Input
                  id={id}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  placeholder="e.g. 25"
                  value={shares}
                  onChange={(e) => setShares(e.target.value)}
                  autoFocus
                />
              )}
            </FormField>
            <FormField label={`Price per share (${currency})`}>
              {(id) => <MoneyInput id={id} value={price} onChange={(e) => setPrice(e.target.value)} />}
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Transaction date">
              {(id) => (
                <Input
                  id={id}
                  type="date"
                  max={localDateInputValue()}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              )}
            </FormField>
            <FormField label={`Fees (${currency})`}>
              {(id) => <MoneyInput id={id} value={fees} onChange={(e) => setFees(e.target.value)} />}
            </FormField>
          </div>

          {canBuy && (
            <dl className="rounded-md bg-muted/40 px-3 py-2 text-xs space-y-1">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">This purchase</dt>
                <dd className="font-medium">{formatMoney(sharesNum * priceNum, currency)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">New total shares</dt>
                <dd className="font-medium">{newTotalShares}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">New avg cost</dt>
                <dd className="font-medium">{formatMoney(newAvgCost, currency)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">New book cost</dt>
                <dd className="font-medium">{formatMoney(newBookCost, currency)}</dd>
              </div>
            </dl>
          )}

          {buyMutation.isError && (
            <p role="alert" className="text-xs text-destructive">
              {getErrorMessage(buyMutation.error)}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={!canBuy || buyMutation.isPending}>
              {buyMutation.isPending ? 'Processing…' : 'Buy shares'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
