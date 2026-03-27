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

export interface WatchlistItem {
  watchlist_id: string
  user_id: string
  stock: Stock
  current_price: number
  day_change: number
  day_change_pct: number
  week_change_pct: number
  month_change_pct: number
  stock_outlook: StockOutlookDirection
  projected_return_pct: number
  portfolio_fit: PortfolioFit
  portfolio_fit_rationale?: string
  confidence_score: number
  disagreement_score: number
  disagreement_label: DisagreementLabel
  suggested_account: string
  suggested_account_rationale?: string
  last_analyzed_at: string
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
