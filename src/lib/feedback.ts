/**
 * The monthly scorecard as the Feedback page reads it. The API serves a scorecard's `data` untyped (its structure is in
 * backend docs, feedback-engine-design.md 5.8 and 5.9), so the few keys read are typed here and nowhere else; a backend test
 * pins their names and the sample in `test/fixtures/feedback` is the real scorer's output.
 */
import type { components } from '@/types/openapi.gen'

type Api = components['schemas']

export interface Hit {
  n: number
  hits: number
  rate: number | null
}

const CONFIDENCE_BANDS = ['under_50', '50_to_64', '65_and_over'] as const
type Band = (typeof CONFIDENCE_BANDS)[number]
export const BAND_WORDS: Record<Band, string> = { under_50: 'Under 50', '50_to_64': '50 to 64', '65_and_over': '65 and over' }

interface HorizonBlock {
  eligible_runs: number
  measures: {
    n: number
    thin: boolean
    q1: {
      rank_correlation: number | null
      vs_market: { hit: Hit }
      hit_vs_baseline: Hit
      by_confidence: Record<Band, { n: number; hit_vs_baseline: Hit }>
    }
  }
  decision_points?: { observations: number; next_decision_point: number | null }
}

interface Overview {
  current_cohort: string
  thresholds: { decision_points_start: number }
}
type Scoring = Record<string, { horizons: Record<string, HorizonBlock> }>

export interface Figures {
  /** Runs of the current version in the scoring set. */
  runs: number
  /** Independent calls with a 1-month result (repeats left out). */
  scored: number
  /** Too few to read much into. */
  thin: boolean
  marketHit: Hit | null
  baselineHit: Hit | null
  rankCorrelation: number | null
  bands: { band: Band; n: number; hit: Hit }[]
  /** Progress to a verdict. */
  observations: number
  nextVerdictAt: number
}

export type Scorecard =
  | { state: 'current'; asOf: string; version: string; figures: Figures }
  /** The newest scorecard was made for an earlier pipeline version: its figures are not shown. */
  | { state: 'old'; asOf: string; version: string; pipeline: string }

/** The newest version and the ones before it that the registry marks as the same view (design 8), newest first. */
function sameViewAsNewest(versions: Api['PipelineVersionResponse'][]): string[] {
  const ids: string[] = []
  for (let i = versions.length - 1; i >= 0; i--) {
    ids.push(versions[i].id)
    if (!versions[i].view_comparable_with_previous) break
  }
  return ids
}

/** `current` only when the scorecard is for today's pipeline: its newest version, or one with the same view. */
export function mapScorecard(
  overview: Api['ScorecardResponse'],
  scoring: Api['ScorecardResponse'],
  versions: Api['PipelineVersionListResponse'],
): Scorecard {
  const { current_cohort: cohort, thresholds } = overview.data as unknown as Overview
  const version = cohort.split('-')[0]
  const live = sameViewAsNewest(versions.data)
  const pipeline = live[0] ?? version
  if (live.length && !live.includes(version)) return { state: 'old', asOf: overview.as_of, version, pipeline }
  const block = (scoring.data as unknown as Scoring)[cohort]?.horizons['1m']
  const q1 = block?.measures.q1
  const scored = block?.measures.n ?? 0
  return {
    state: 'current',
    asOf: overview.as_of,
    version,
    figures: {
      runs: block?.eligible_runs ?? 0,
      scored,
      thin: block?.measures.thin ?? true,
      marketHit: scored ? q1!.vs_market.hit : null,
      baselineHit: scored ? q1!.hit_vs_baseline : null,
      rankCorrelation: scored ? q1!.rank_correlation : null,
      bands: scored ? CONFIDENCE_BANDS.map((band) => ({ band, n: q1!.by_confidence[band].n, hit: q1!.by_confidence[band].hit_vs_baseline })) : [],
      observations: block?.decision_points?.observations ?? 0,
      nextVerdictAt: block?.decision_points?.next_decision_point ?? thresholds.decision_points_start,
    },
  }
}
