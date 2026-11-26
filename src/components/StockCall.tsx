/**
 * The call a stock's newest analysis made, as the lists of stocks show it. Built from the shared `StockSnapshot`
 * (`lib/stock-snapshot.ts`), so Holdings, Watchlist and the Stock page agree. `CallHeadline` is the direction and the tier in plain
 * text, `CallWarning` the one icon for a call that cannot be used; `StockCall` is the Holdings cell made of both, with the
 * confidence, the age and the link. A stock with no usable call is a normal state, not an error.
 */
import { Link } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { ConfidenceMeter } from '@/components/ConfidenceMeter'
import { OUTLOOK_LABELS, TIER_EXPLANATIONS, TIER_LABELS, TONE_TEXT, exclusionLabel } from '@/lib/labels'
import { callAgeDays, type AnalysisCall, type StockSnapshot } from '@/lib/stock-snapshot'

export function CallHeadline({ analysis }: { analysis: AnalysisCall | null | undefined }) {
  return (
    <>
      {analysis?.outlook ? <span>{OUTLOOK_LABELS[analysis.outlook]}</span> : <span className="text-muted-foreground">No call</span>}
      {analysis?.tier && (
        <span title={TIER_EXPLANATIONS[analysis.tier]}>
          <span className="text-muted-foreground" aria-hidden="true"> · </span>
          <span>{TIER_LABELS[analysis.tier]}</span>
        </span>
      )}
    </>
  )
}

/** Nothing for a usable call; otherwise one icon with every reason on hover and the first for screen readers. */
export function CallWarning({ call }: { call: StockSnapshot }) {
  if (call.status !== 'excluded') return null
  const reasons = call.exclusions.map(exclusionLabel)
  return (
    <span className={TONE_TEXT.warning} title={reasons.join('; ') || 'Not usable'}>
      <AlertTriangle className="inline w-3.5 h-3.5" aria-hidden="true" />
      <span className="sr-only">{reasons[0] ?? 'Not usable'}</span>
    </span>
  )
}

interface StockCallProps {
  call: StockSnapshot | null
  /** False for an instrument the pipeline cannot analyse (a fund, a preferred share): shown as a dash, the stock cell says why. */
  supported?: boolean
}

export function StockCall({ call, supported = true }: StockCallProps) {
  if (!supported) return <span className="text-muted-foreground">—</span>
  if (!call) return <span className="text-muted-foreground text-sm">No call</span>

  const analysis = call.analysis
  const age = callAgeDays(analysis?.asOf ?? null)

  return (
    <div className="space-y-1">
      <div className="text-sm">
        <CallHeadline analysis={analysis} />
      </div>
      {analysis?.confidence != null && <ConfidenceMeter score={analysis.confidence} />}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {age != null && <span>{age === 0 ? 'Today' : `${age}d ago`}</span>}
        <CallWarning call={call} />
        {analysis && (
          <Link to={`/analysis/${analysis.runId}`} className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
            Analysis
          </Link>
        )}
      </div>
    </div>
  )
}
