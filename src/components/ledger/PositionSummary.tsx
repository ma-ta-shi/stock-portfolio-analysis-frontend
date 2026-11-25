import type { ReactNode } from 'react'
import { formatMoney } from '@/lib/format'
import type { Holding } from '@/types/portfolio'

/** The position a Buy or Sell acts on: shares held, average cost and one more figure the dialog cares about. */
export function PositionSummary({ holding, third }: { holding: Holding; third: { label: string; value: ReactNode } }) {
  return (
    <dl className="grid grid-cols-3 gap-2 rounded-md bg-muted/40 px-3 py-2 text-xs">
      <div>
        <dt className="text-muted-foreground">Shares held</dt>
        <dd className="font-medium">{holding.shares}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Avg cost</dt>
        <dd className="font-medium">{formatMoney(holding.average_cost_basis, holding.stock.currency)}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">{third.label}</dt>
        <dd className="font-medium">{third.value}</dd>
      </div>
    </dl>
  )
}
