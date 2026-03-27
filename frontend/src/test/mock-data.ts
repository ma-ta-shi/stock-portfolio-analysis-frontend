import type { FeedbackData, Holding } from '@/types'

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

export const mockHolding: Holding = {
  holding_id: 'h_001',
  user_id: 'user_01',
  stock: {
    stock_id: 'stk_ry_to',
    ticker: 'RY.TO',
    name: 'Royal Bank of Canada',
    exchange: 'TSX',
    currency: 'CAD',
    sector: 'Financials',
  },
  account_type: 'tfsa',
  shares: 50,
  average_cost_basis: 130.0,
  current_price: 145.0,
  market_value: 7250.0,
  total_gain_loss: 750.0,
  total_gain_loss_pct: 0.1154,
  day_change: 50.0,
  day_change_pct: 0.0069,
  stock_outlook: 'somewhat_bullish',
  confidence_score: 78,
  disagreement_score: 0.2,
  disagreement_label: 'low',
  last_analyzed_at: '2026-03-25T10:00:00Z',
  annual_dividend_per_share: 5.72,
  annual_dividend_yield: 0.0394,
  yield_on_cost: 0.044,
  added_at: '2025-09-01T00:00:00Z',
  last_updated: '2026-03-26T09:00:00Z',
}
