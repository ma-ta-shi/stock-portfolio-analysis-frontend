import type { ReactNode } from 'react'
import { formatMoney } from '@/lib/format'
import type { Holding } from '@/types/portfolio'

/** Label and value cells in a tinted grid: what a ledger dialog shows of the position it acts on. */
export function SummaryCells({ cells }: { cells: { label: string; value: ReactNode }[] }) {
  return (
    <dl className={`grid ${cells.length === 2 ? 'grid-cols-2' : 'grid-cols-3'} gap-2 rounded-md bg-muted/40 px-3 py-2 text-xs`}>
      {cells.map(({ label, value }) => (
        <div key={label}>
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="font-medium">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

/** The position a Buy or Sell acts on: shares held, average cost and one more figure the dialog cares about. */
export function PositionSummary({ holding, third }: { holding: Holding; third: { label: string; value: ReactNode } }) {
  return (
    <SummaryCells
      cells={[
        { label: 'Shares held', value: holding.shares },
        { label: 'Avg cost', value: formatMoney(holding.average_cost_basis, holding.stock.currency) },
        third,
      ]}
    />
  )
}
