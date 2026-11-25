/**
 * The call a stock's newest analysis made, as every list of stocks shows it: outlook (and whether it changed), tier and
 * expected return, confidence, disagreement, and the state of the call (how old, and why it cannot be used when it cannot).
 * Built from the shared `StockSnapshot` (`lib/stock-snapshot.ts`), so Portfolio, Watchlist and the Stock page agree.
 * A stock with no usable call is a normal state, not an error.
 */
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import { ConfidenceMeter } from '@/components/ConfidenceMeter'
import { OutlookBadge } from '@/components/OutlookBadge'
import { Badge } from '@/components/ui/badge'
import { formatPct } from '@/lib/format'
import { DISAGREEMENT_CLASS_LABELS, OUTLOOK_LABELS, TIER_EXPLANATIONS, TIER_LABELS, TONE_TEXT, exclusionLabel } from '@/lib/labels'
import { callAgeDays, type StockSnapshot } from '@/lib/stock-snapshot'
import { cn } from '@/lib/utils'

interface StockCallProps {
  call: StockSnapshot | null
  /** False for an instrument the pipeline cannot analyse (a fund, a preferred share): shown as a dash, the stock cell says why. */
  supported?: boolean
  now?: number
  /** One tidy cell for a table row: the direction and the tier in plain text, the confidence, and the notices as one icon. */
  compact?: boolean
}

export function StockCall({ call, supported = true, now, compact = false }: StockCallProps) {
  if (!supported) return <span className="text-muted-foreground">—</span>
  if (!call) return <span className="text-muted-foreground text-sm">No call</span>

  const analysis = call.analysis
  const age = callAgeDays(analysis?.asOf ?? null, now)
  const reasons = call.exclusions.map(exclusionLabel)

  if (compact) {
    return (
      <div className="space-y-1">
        <div className="text-sm">
          {analysis?.outlook ? <span>{OUTLOOK_LABELS[analysis.outlook]}</span> : <span className="text-muted-foreground">No call</span>}
          {analysis?.tier && (
            <span title={TIER_EXPLANATIONS[analysis.tier]}>
              <span className="text-muted-foreground" aria-hidden="true"> · </span>
              <span>{TIER_LABELS[analysis.tier]}</span>
            </span>
          )}
        </div>
        {analysis?.confidence != null && <ConfidenceMeter score={analysis.confidence} />}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {age != null && <span>{age === 0 ? 'Today' : `${age}d ago`}</span>}
          {call.status === 'excluded' && (
            <span className={TONE_TEXT.warning} title={reasons.join('; ') || 'Not usable'}>
              <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="sr-only">{reasons[0] ?? 'Not usable'}</span>
            </span>
          )}
          {analysis && (
            <Link to={`/analysis/${analysis.runId}`} className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
              Analysis
            </Link>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {analysis?.outlook ? (
        <div className="flex items-center gap-1.5 flex-wrap">
          <OutlookBadge direction={analysis.outlook} />
          {analysis.outlookChanged && analysis.previousOutlook && (
            <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground" title={`Was ${OUTLOOK_LABELS[analysis.previousOutlook]}`}>
              <span className="sr-only">Changed from {OUTLOOK_LABELS[analysis.previousOutlook]}</span>
              <ArrowRight className="w-3 h-3" aria-hidden="true" />
              changed
            </span>
          )}
        </div>
      ) : (
        <span className="text-muted-foreground text-sm">No call</span>
      )}

      {analysis?.tier && (
        <div className="text-xs" title={TIER_EXPLANATIONS[analysis.tier]}>
          {TIER_LABELS[analysis.tier]}
          {analysis.expectedReturn != null && (
            <span className="text-muted-foreground"> · {formatPct(analysis.expectedReturn, 1)} expected</span>
          )}
        </div>
      )}

      {analysis?.confidence != null && <ConfidenceMeter score={analysis.confidence} />}

      {analysis?.disagreementClass && (
        <div className={cn('text-xs', DISAGREEMENT_CLASS_LABELS[analysis.disagreementClass].tone)}>
          {DISAGREEMENT_CLASS_LABELS[analysis.disagreementClass].label}
        </div>
      )}

      <div className="flex items-center gap-1.5 flex-wrap text-xs text-muted-foreground">
        {age != null && <span>Analysed {age === 0 ? 'today' : `${age}d ago`}</span>}
        {call.status === 'excluded' && (
          <Badge variant="outline" className={cn('text-xs border-amber-500', TONE_TEXT.warning)} title={reasons.join('; ') || undefined}>
            {reasons[0] ?? 'Not usable'}
            {reasons.length > 1 ? ` +${reasons.length - 1}` : ''}
          </Badge>
        )}
        {analysis && (
          <Link to={`/analysis/${analysis.runId}`} className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
            Analysis
          </Link>
        )}
      </div>
    </div>
  )
}
