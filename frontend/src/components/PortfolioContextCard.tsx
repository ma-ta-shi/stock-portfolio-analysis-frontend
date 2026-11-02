import { formatCAD } from '@/lib/format'
import { FIT_BADGE_COLORS, FIT_BOX_COLORS, FIT_LABELS } from '@/lib/labels'
import { cn } from '@/lib/utils'
import type { Layer2PortfolioContext } from '@/types'

interface PortfolioContextCardProps {
  context: Omit<Layer2PortfolioContext, 'holding_snapshot'>
  /** Account note with template placeholders already filled in. */
  accountNote?: string
}

/** "Layer 2 — Portfolio Context" card shared by the Stock and Analysis pages. */
export function PortfolioContextCard({ context, accountNote }: PortfolioContextCardProps) {
  const fit = context.portfolio_fit
  return (
    <section
      aria-labelledby="portfolio-context-heading"
      className={cn('border rounded-lg p-5 space-y-3', FIT_BOX_COLORS[fit])}
    >
      <h2
        id="portfolio-context-heading"
        className="font-semibold text-sm uppercase tracking-wide text-muted-foreground"
      >
        Layer 2 — Portfolio Context
      </h2>
      <div className="flex items-center gap-2 flex-wrap">
        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', FIT_BADGE_COLORS[fit])}>
          {FIT_LABELS[fit]}
        </span>
        <span className="text-sm text-muted-foreground">{context.portfolio_fit_rationale}</span>
      </div>
      <div className={cn('rounded-md border p-3', FIT_BOX_COLORS[fit])}>
        <p className="text-sm font-medium">{context.suggested_action}</p>
        {context.suggested_amount_cad != null && (
          <p className="text-xs text-muted-foreground mt-0.5">
            Suggested amount: {formatCAD(context.suggested_amount_cad)}
          </p>
        )}
      </div>
      {accountNote && (
        <div className="border-t border-border pt-3">
          <p className="text-xs font-medium text-muted-foreground mb-1">Account Note</p>
          <p className="text-sm leading-relaxed text-muted-foreground">{accountNote}</p>
        </div>
      )}
      {context.would_replace && (
        <p className="text-xs text-muted-foreground">
          Would replace: <span className="font-medium text-foreground">{context.would_replace}</span>
        </p>
      )}
    </section>
  )
}
