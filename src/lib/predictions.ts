/** A prediction's check-ins (1, 3, 6 and 12 months), read once for the Stock page's history and the Feedback page. */
import { asFraction } from './units'
import type { components } from '@/types/openapi.gen'

export type ApiPrediction = components['schemas']['PredictionResponse']
type ApiCheckpoint = components['schemas']['PredictionCheckpointResponse']

export interface Checkpoint {
  interval: string
  status: ApiCheckpoint['status']
  resolved: boolean
  due: string
  /** Why it is still waiting or needs review. */
  reason: string | null
  /** Fractions, from the call to the check-in; null until resolved. */
  totalReturn: number | null
  marketReturn: number | null
  excessReturn: number | null
  /** The return the price band expected by this date; a fraction. */
  expected: number | null
}

export function mapCheckpoints(prediction: ApiPrediction | undefined): Checkpoint[] {
  return (prediction?.checkpoints ?? []).map((c) => ({
    interval: c.interval,
    status: c.status,
    resolved: c.status === 'resolved',
    due: c.due_date,
    reason: c.status_reason ?? null,
    totalReturn: asFraction('PredictionCheckpointResponse.actual_total_return_pct', c.actual_total_return_pct),
    marketReturn: asFraction('PredictionCheckpointResponse.benchmark_total_return_pct', c.benchmark_total_return_pct),
    excessReturn: asFraction('PredictionCheckpointResponse.excess_return_pct', c.excess_return_pct),
    expected: asFraction('PredictionCheckpointResponse.interpolated_expected', c.interpolated_expected),
  }))
}

export function predictionState(row: { checkpoints: readonly Checkpoint[] }): 'resolved' | 'pending' | null {
  if (!row.checkpoints.length) return null
  return row.checkpoints.some((c) => c.resolved) ? 'resolved' : 'pending'
}

export const CHECKPOINT_WORDS: Record<ApiCheckpoint['status'], string> = { pending: 'waiting', resolved: 'checked', needs_review: 'needs review' }
export const INTERVAL_WORDS: Record<string, string> = { '1m': '1 month', '3m': '3 months', '6m': '6 months', '12m': '12 months' }

/** Where a prediction stands, in words. */
export function checkedText(checkpoints: readonly Checkpoint[]): string {
  if (!checkpoints.length) return 'Not scored: no price band'
  const done = checkpoints.filter((c) => c.resolved).length
  return done ? `${done} of ${checkpoints.length} checked` : 'Waiting'
}
