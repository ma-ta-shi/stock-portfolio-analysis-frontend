import type { FeedbackData } from '@/types'
import { mapHolding, type ApiHolding } from '@/lib/portfolio-mappers'
import holdingsFixture from '../../public/mock-data/portfolio/holdings.json'

export const mockAccuracySummary: FeedbackData['accuracy_summary'] = {
  total_scored_predictions: 24,
  direction_accuracy: 0.75,
  avg_composite_score: 0.68,
  alpha_vs_tsx_pct: 0.12,
  avg_return_when_correct: 0.08,
  avg_return_when_incorrect: -0.04,
}

export const mockFeedbackData: FeedbackData = {
  user_id: 'user_01',
  as_of: '2026-03-26T00:00:00Z',
  accuracy_summary: mockAccuracySummary,
  walk_forward_equity_curve: {
    starting_value: 75000,
    current_value: 95000,
    benchmark_current_value: 88000,
    periods: [
      { date: '2025-09-01', portfolio_value: 75000, benchmark_value: 75000 },
      { date: '2025-12-01', portfolio_value: 85000, benchmark_value: 80000 },
      { date: '2026-03-01', portfolio_value: 95000, benchmark_value: 88000 },
    ],
  },
  confidence_calibration: [
    { confidence_bucket: '50-60', predictions: 4, accuracy: 0.5, avg_return: -0.01 },
    { confidence_bucket: '60-70', predictions: 8, accuracy: 0.625, avg_return: 0.03 },
    { confidence_bucket: '70-80', predictions: 7, accuracy: 0.71, avg_return: 0.06 },
    { confidence_bucket: '80-90', predictions: 5, accuracy: 1.0, avg_return: 0.12 },
  ],
  by_agent_accuracy: {
    fundamental_analyst: { signal_accuracy: 0.75, contribution_score: 0.82 },
    technical_analyst: { signal_accuracy: 0.62, contribution_score: 0.55 },
  },
  competence_boundaries: {
    best_performing_sectors: ['Technology', 'Industrials'],
    weakest_performing_sectors: ['Energy'],
    best_timeline: 'medium_term',
    weakest_timeline: 'short_term',
  },
  learning_journal: [
    { date: '2026-03-01', insight: 'Strong FCF companies outperformed in Q1.' },
  ],
}

// Portfolio rows come from the recorded API responses (`npm run record:fixtures`), mapped by the real mapper.
const rows = holdingsFixture.data as unknown as ApiHolding[]
const byTicker = (ticker: string) => {
  const row = rows.find((h) => h.stock.ticker === ticker && h.is_active)
  if (!row) throw new Error(`Fixture has no active holding ${ticker}`)
  return mapHolding(row)
}

/** RY.TO in the RRSP: a Canadian stock with a usable call. */
export const mockHolding = byTicker('RY.TO')
/** RDDT in Trading: a USD holding whose call is excluded. */
export const mockUsdHolding = byTicker('RDDT')

/** Every recorded holding, mapped: active and closed, usable, stale and unsupported calls. */
export const mockHoldings = rows.map((row) => mapHolding(row))
/** One recorded holding by ticker (the first match, active or closed). */
export function fixtureHolding(ticker: string) {
  const found = mockHoldings.find((h) => h.stock.ticker === ticker)
  if (!found) throw new Error(`Fixture has no holding ${ticker}`)
  return found
}
