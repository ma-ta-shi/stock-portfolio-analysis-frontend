import { useId } from 'react'
import { unavailableLabel } from '@/lib/gaps'

/**
 * "Layer 2 — Portfolio Context", shared by the Stock and Analysis pages. Nothing serves it (analyses are account-neutral, gap S-2),
 * so it says so; the card keeps the design's place for it.
 */
export function PortfolioContextCard() {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className="border border-border rounded-lg p-5 space-y-2">
      <h2 id={headingId} className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
        Layer 2 — Portfolio Context
      </h2>
      <p className="text-sm text-muted-foreground">Fit, suggested action and account note: {unavailableLabel('S-2')}</p>
    </section>
  )
}
