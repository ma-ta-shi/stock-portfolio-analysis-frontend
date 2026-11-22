import type { Stock } from './stock'

export type Recommendation = 'BUY' | 'HOLD' | 'SELL'
export type StockOutlookDirection =
  | 'bullish'
  | 'somewhat_bullish'
  | 'neutral'
  | 'somewhat_bearish'
  | 'bearish'
export type PortfolioFit = 'strong_candidate' | 'worth_monitoring' | 'poor_fit'
export type DisagreementLabel = 'low' | 'moderate' | 'high'

/**
 * A stock on the watchlist.
 *
 * A newly added stock exists before the backend has priced or analysed it, so:
 * - market fields are `null` until the first price fetch;
 * - analysis fields are `null` until the first analysis completes
 *   (`last_analyzed_at === null` means "awaiting analysis").
 * The backend must return `null` here rather than placeholder values like 0 or "neutral".
 */
export interface WatchlistItem {
  watchlist_id: string
  user_id: string
  stock: Stock
  // Market data
  current_price: number | null
  day_change: number | null
  day_change_pct: number | null
  week_change_pct: number | null
  month_change_pct: number | null
  // Analysis results
  stock_outlook: StockOutlookDirection | null
  projected_return_pct: number | null
  portfolio_fit: PortfolioFit | null
  portfolio_fit_rationale?: string | null
  confidence_score: number | null
  disagreement_score: number | null
  disagreement_label: DisagreementLabel | null
  suggested_account: string | null
  suggested_account_rationale?: string | null
  last_analyzed_at: string | null
  added_at: string
}

export interface WatchlistSummary {
  total: number
  bullish_count: number
  changed_since_last_check: number
}

export interface WatchlistResponse {
  data: WatchlistItem[]
  summary: WatchlistSummary
}
