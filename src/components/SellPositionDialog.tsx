import { useState, type FormEvent } from 'react'
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
import { FormField } from '@/components/FormField'
import { MoneyInput } from '@/components/MoneyInput'
import { useSellPosition, usePortfolioHoldings } from '@/hooks/use-portfolio'
import { useUserProfile } from '@/hooks/use-user-profile'
import { useFxRates } from '@/hooks/use-fx-rates'
import { getErrorMessage } from '@/lib/api'
import { toCad } from '@/lib/fx'
import {
  formatCAD,
  formatMoney,
  formatPct,
  formatPercent,
  localDateInputValue,
  parseAmount,
} from '@/lib/format'
import { gainLossColor } from '@/lib/labels'
import { estimateSell } from '@/lib/sell-preview'
import { cn } from '@/lib/utils'
import type { Holding } from '@/types'

const DEFAULT_FEE = '4.99'

interface SellPositionDialogProps {
  holding: Holding | null
  onClose: () => void
}

export function SellPositionDialog({ holding, onClose }: SellPositionDialogProps) {
  const [shares, setShares] = useState(() => (holding ? String(holding.shares) : ''))
  const [price, setPrice] = useState(() => (holding?.current_price != null ? holding.current_price.toFixed(2) : ''))
  const [fees, setFees] = useState(DEFAULT_FEE)
  const [date, setDate] = useState(() => localDateInputValue())

  const sellMutation = useSellPosition()
  const { data: allHoldings } = usePortfolioHoldings()
  const { data: profile } = useUserProfile()
  const { rates } = useFxRates()

  const sharesNum = parseAmount(shares)
  const priceNum = parseAmount(price)
  const feesNum = parseAmount(fees)
  const maxShares = holding?.shares ?? 0
  const sharesValid = sharesNum > 0 && sharesNum <= maxShares
  const canSell = holding !== null && sharesValid && priceNum > 0 && date !== ''
  const currency = holding?.stock.currency ?? 'CAD'

  const preview =
    holding && canSell
      ? estimateSell({
          holding,
          shares: sharesNum,
          price: priceNum,
          fees: feesNum,
          otherHoldings: allHoldings ?? [],
          marginalTaxRate: profile?.financial_profile?.marginal_tax_rate, // the live profile has no financial_profile yet: the Settings ticket (86bd5z6n3) maps it
          toCad: (amount) => toCad(amount, currency, rates),
        })
      : null

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!holding || !canSell) return
    try {
      await sellMutation.mutateAsync({
        holdingId: holding.holding_id,
        shares: sharesNum,
        pricePerShare: priceNum,
        fees: feesNum,
        // The API takes a calendar date ("2026-04-02"). Converting via toISOString() would
        // make it UTC midnight, which displays as the previous day in Canada.
        transactionDate: date,
      })
      onClose()
    } catch {
      // Error is shown from sellMutation.error below; keep the dialog open.
    }
  }

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
              <dt className="text-muted-foreground">Unrealized</dt>
              <dd className={cn('font-medium', gainLossColor(holding.total_gain_loss ?? 0))}>
                {formatMoney(holding.total_gain_loss, currency, { signed: true })}
              </dd>
            </div>
          </dl>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <FormField
              label={<>Shares to sell <span className="text-muted-foreground">(max {maxShares})</span></>}
              error={sharesNum > maxShares ? `Cannot exceed ${maxShares} shares` : undefined}
            >
              {(id, describedBy) => (
                <Input
                  id={id}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max={maxShares}
                  step="any"
                  value={shares}
                  onChange={(e) => setShares(e.target.value)}
                  autoFocus
                  aria-invalid={sharesNum > maxShares || undefined}
                  aria-describedby={describedBy}
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

          {preview && (
            <div className="space-y-2" aria-live="polite">
              <div
                className={cn(
                  'rounded-md px-3 py-2.5 text-sm font-medium text-center',
                  preview.realizedGainLoss >= 0
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                    : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400',
                )}
              >
                Realized {preview.realizedGainLoss >= 0 ? 'gain' : 'loss'}:{' '}
                {formatMoney(preview.realizedGainLoss, currency, { signed: true })} (
                {formatPct(preview.realizedGainLossPct)})
              </div>

              {preview.tax.kind === 'estimate' && (
                <dl className="rounded-md bg-muted/40 px-3 py-2 text-xs space-y-0.5">
                  <div className="font-medium text-muted-foreground mb-1">
                    Tax implications (Trading account{currency !== 'CAD' ? ', converted to CAD at today’s rate' : ''})
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Capital gain</dt>
                    <dd>{formatCAD(preview.tax.capitalGainCad)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Taxable capital gain (50% inclusion)</dt>
                    <dd>{formatCAD(preview.tax.taxableGainCad)}</dd>
                  </div>
                  <div className="flex justify-between font-medium">
                    <dt className="text-muted-foreground">
                      Estimated tax ({formatPercent(preview.tax.marginalRate, 0)} marginal rate
                      {preview.tax.rateIsAssumed ? ', assumed' : ''})
                    </dt>
                    <dd>~{formatCAD(preview.tax.estimatedTaxCad)}</dd>
                  </div>
                </dl>
              )}
              {preview.tax.kind === 'no_fx_rate' && (
                <p className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  Tax estimate unavailable until the {currency}/CAD exchange rate loads.
                </p>
              )}

              {preview.superficialLossDetail && (
                <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{preview.superficialLossDetail}</span>
                </div>
              )}

              {preview.closesPosition && (
                <p className="text-xs text-muted-foreground text-center">
                  Selling all shares — this position will be closed.
                </p>
              )}
            </div>
          )}

          {sellMutation.isError && (
            <p role="alert" className="text-xs text-destructive">
              {getErrorMessage(sellMutation.error)}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="destructive" disabled={!canSell || sellMutation.isPending}>
              {sellMutation.isPending ? 'Processing…' : `Sell ${sharesValid ? sharesNum : ''} shares`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
