/**
 * The Feedback page: this week's batch and the scorecard's figures, the owner's portfolio against the market fund, and the
 * predictions of the weekly batch runs. `PREDICTION_FIELDS` are the history table; the scorecard's figures are read by
 * `lib/feedback.ts`.
 */
import { Link } from 'react-router-dom'
import { defineFields, type ApiFieldKey, type NotShown, type ScreenFieldSet } from '@/lib/fields'
import { formatMoney, formatPct } from '@/lib/format'
import { OUTLOOK_LABELS, TIER_LABELS } from '@/lib/labels'
import type { ReturnTier } from '@/lib/stock-snapshot'
import { CHECKPOINT_WORDS, INTERVAL_WORDS, checkedText, mapCheckpoints, type ApiPrediction } from '@/lib/predictions'
import { asFraction } from '@/lib/units'
import { cn } from '@/lib/utils'
import type { StockOutlookDirection } from '@/types'
import { day } from '../formatters'

const column = ['column' as const]
const detail = ['detail' as const]
const DOT = { resolved: 'bg-foreground', pending: 'border border-muted-foreground', needs_review: 'bg-amber-500' } as const

const call = (p: ApiPrediction) =>
  [OUTLOOK_LABELS[p.stock_outlook_direction as StockOutlookDirection], p.predicted_return_tier && TIER_LABELS[p.predicted_return_tier as ReturnTier]]
    .filter(Boolean)
    .join(' · ')

export const PREDICTION_FIELDS = defineFields<ApiPrediction>([
  {
    id: 'ticker',
    label: 'Ticker',
    source: ['PredictionResponse.stock', 'AnalysisStock.ticker', 'AnalysisStock.stock_id'],
    get: (p) => p.stock.ticker,
    places: column,
    render: (p) => (
      <Link className="font-medium underline underline-offset-2" to={`/stocks/${p.stock.stock_id}`}>
        {p.stock.ticker}
      </Link>
    ),
  },
  { id: 'made', label: 'Made', source: 'PredictionResponse.created_at', get: (p) => p.created_at, format: day, places: column },
  { id: 'call', label: 'Call', source: ['PredictionResponse.stock_outlook_direction', 'PredictionResponse.predicted_return_tier'], get: (p) => p.stock_outlook_direction, format: (_v, p) => call(p), places: column },
  { id: 'confidence', label: 'Confidence', source: 'PredictionResponse.overall_confidence', get: (p) => p.overall_confidence, format: (v) => `${v}%`, places: column },
  { id: 'price', label: 'Price at call', source: ['PredictionResponse.price_at_recommendation', 'AnalysisStock.currency'], get: (p) => p.price_at_recommendation, format: (v, p) => formatMoney(v as number, p.stock.currency === 'USD' ? 'USD' : 'CAD'), places: column },
  { id: 'status', label: 'Status', source: ['PredictionResponse.checkpoints', 'PredictionCheckpointResponse.status'], get: (p) => checkedText(mapCheckpoints(p)), places: column },
  {
    id: 'checkpoints',
    label: 'Check-ins',
    source: 'PredictionCheckpointResponse.interval',
    get: (p) => mapCheckpoints(p).map((c) => `${INTERVAL_WORDS[c.interval] ?? c.interval}: ${CHECKPOINT_WORDS[c.status]}`).join(', '),
    tooltip: '1, 3, 6 and 12 months: filled is checked, outlined is waiting, amber needs review. Open a row for the figures',
    places: column,
    render: (p) => {
      const checks = mapCheckpoints(p)
      if (!checks.length) return <span className="text-muted-foreground">—</span>
      return (
        <span className="flex gap-1" role="img" aria-label={checks.map((c) => `${INTERVAL_WORDS[c.interval] ?? c.interval}: ${CHECKPOINT_WORDS[c.status]}`).join(', ')}>
          {checks.map((c) => (
            <span key={c.interval} className={cn('inline-block w-2.5 h-2.5 rounded-full', DOT[c.status])} />
          ))}
        </span>
      )
    },
  },
  { id: 'predicted', label: 'Predicted return', source: 'PredictionResponse.predicted_return_pct', get: (p) => asFraction('PredictionResponse.predicted_return_pct', p.predicted_return_pct), format: (v) => formatPct(v as number | null, 1), places: detail },
  {
    id: 'range',
    label: 'Predicted range',
    source: ['PredictionResponse.predicted_return_low', 'PredictionResponse.predicted_return_high'],
    get: (p) => asFraction('PredictionResponse.predicted_return_low', p.predicted_return_low),
    format: (v, p) => (v == null ? '—' : `${formatPct(v as number, 1)} to ${formatPct(asFraction('PredictionResponse.predicted_return_high', p.predicted_return_high), 1)}`),
    places: detail,
  },
])

const keys = (schema: string, fields: readonly string[], entry: NotShown) => Object.fromEntries(fields.map((f) => [`${schema}.${f}`, entry]))
// The prediction and stock shapes are claimed by the Stock page's field set; this one draws from them without deciding them again.
const id: NotShown = { reason: 'An id or record bookkeeping' }
const rest: NotShown = { reason: 'Part of the scorecard or the prediction with no place in the design', gap: 'F-2' }

export const FEEDBACK_NOT_SHOWN = {
  ...keys('ScorecardResponse', ['scorer_version', 'section', 'available'], id),
  ...keys('BatchWeekResponse', ['added_this_week', 'removed_this_week', 'complete'], rest),
  ...keys('WeeklyBatchResponse', ['as_of', 'user_id', 'timeline', 'due_today', 'stocks'], rest),
  ...keys('PipelineVersionResponse', ['date', 'prompts_hash', 'band_settings', 'model', 'description', 'change'], rest),
} as Partial<Record<ApiFieldKey, NotShown>>

export const FEEDBACK_SCREEN: ScreenFieldSet = {
  screen: 'feedback',
  schemas: ['ScorecardResponse', 'WeeklyBatchResponse', 'BatchWeekResponse', 'PipelineVersionResponse'],
  fields: [
    ...PREDICTION_FIELDS,
    // drawn in each row's check-in table
    { id: 'due', label: 'Due', source: 'PredictionCheckpointResponse.due_date', places: detail },
    { id: 'returns', label: 'Return, market, difference, expected', source: ['PredictionCheckpointResponse.actual_total_return_pct', 'PredictionCheckpointResponse.benchmark_total_return_pct', 'PredictionCheckpointResponse.excess_return_pct', 'PredictionCheckpointResponse.interpolated_expected'], places: detail },
    { id: 'why', label: 'Why it waits', source: 'PredictionCheckpointResponse.status_reason', places: detail },
    // the scorecard (lib/feedback.ts), the progress strip and the version it is checked against
    { id: 'scorecard', label: 'Scorecard figures', source: ['ScorecardResponse.as_of', 'ScorecardResponse.data'], places: column },
    { id: 'batch', label: "This week's batch", source: ['WeeklyBatchResponse.week', 'BatchWeekResponse.week_start', 'BatchWeekResponse.required', 'BatchWeekResponse.done', 'BatchWeekResponse.pending', 'BatchWeekResponse.gave_up'], places: column },
    { id: 'pipeline', label: 'Pipeline version', source: ['PipelineVersionResponse.id', 'PipelineVersionResponse.view_comparable_with_previous'], places: column },
  ],
  notShown: FEEDBACK_NOT_SHOWN,
}
