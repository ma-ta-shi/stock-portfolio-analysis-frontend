import type { Stock } from './stock'
import type { StockOutlookDirection, DisagreementLabel } from './watchlist'
import type { PaginationMeta } from './api'

export type PortfolioAccountView = 'combined' | 'tfsa' | 'rrsp' | 'trading'

export interface AccountBreakdown {
  value: number
  cost: number
  gain_loss: number
  gain_loss_pct: number
}

export interface PortfolioSummary {
  user_id: string
  total_value_cad: number
  total_cost_cad: number
  total_gain_loss_cad: number
  total_gain_loss_pct: number
  day_change_cad: number
  day_change_pct: number
  by_account: Record<string, AccountBreakdown>
  sparkline_30d: number[]
  as_of?: string
  annual_dividend_income_estimate_cad?: number
  dividend_by_account?: Record<string, number>
  top_performer?: { ticker: string; account_type: string; gain_loss_pct: number }
  worst_performer?: { ticker: string; account_type: string; gain_loss_pct: number }
  holdings_count?: number
  last_updated?: string
}

export interface Holding {
  holding_id: string
  user_id: string
  stock: Stock
  account_type: string
  shares: number
  average_cost_basis: number
  current_price: number
  market_value: number
  total_gain_loss: number
  total_gain_loss_pct: number
  day_change: number
  day_change_pct: number
  stock_outlook: StockOutlookDirection
  confidence_score: number
  disagreement_score: number
  disagreement_label: DisagreementLabel
  last_analyzed_at: string
  annual_dividend_per_share: number
  annual_dividend_yield: number
  yield_on_cost: number
  added_at: string
  last_updated: string
}

export interface PortfolioHoldingsResponse {
  data: Holding[]
  meta: PaginationMeta
}
