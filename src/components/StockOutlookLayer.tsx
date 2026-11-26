import { useId, type ReactNode } from 'react'
import { formatDate } from '@/lib/format'
import type { Driver } from '@/lib/stock-detail'

interface StockOutlookLayerProps {
  drivers: readonly Driver[]
  narrative?: string | null
  /** The day of the analysis, where the page does not say it elsewhere. */
  date?: string | null
  /** Shown instead of the content when the analysis could not be read. */
  error?: ReactNode
}

/** "Layer 1 — Stock Outlook", shared by the Stock and Analysis pages: the drivers and the summary of one analysis. */
export function StockOutlookLayer({ drivers, narrative, date, error }: StockOutlookLayerProps) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className="bg-card border border-border rounded-lg p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 id={headingId} className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
          Layer 1 — Stock Outlook
        </h2>
        {date && <span className="text-xs text-muted-foreground">{formatDate(date)}</span>}
      </div>
      {error || (
        <>
          {drivers.length > 0 && (
            <ul className="space-y-1">
              {drivers.map((driver, i) => (
                <li key={i} className="text-sm flex gap-2">
                  <span className="text-muted-foreground shrink-0">·</span>
                  <span className="font-medium">{driver.factor}</span>
                  {driver.direction && <span className="text-muted-foreground">{driver.direction}</span>}
                </li>
              ))}
            </ul>
          )}
          {narrative && <p className="text-sm leading-relaxed whitespace-pre-line">{narrative}</p>}
        </>
      )}
    </section>
  )
}
