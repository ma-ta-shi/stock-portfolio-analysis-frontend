import type { Stock } from './stock'
import type { StockOutlookDirection, DisagreementLabel } from './watchlist'
import type { PaginationMeta } from './api'

export type PortfolioAccountView = 'combined' | 'tfsa' | 'rrsp' | 'trading'
export type TransactionType = 'buy' | 'sell' | 'dividend' | 'drip' | 'transfer_in' | 'transfer_out'

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
  // P&L tracking
  total_realized_gain_loss_cad?: number
  total_dividends_received_cad?: number
  total_return_cad?: number
  total_return_pct?: number
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
  is_active?: boolean
  total_realized_gain_loss?: number
  transaction_count?: number
}

export interface PortfolioHoldingsResponse {
  data: Holding[]
  meta: PaginationMeta
}

export interface Transaction {
  transaction_id: string
  holding_id: string | null
  user_id: string
  stock: Stock
  account_type: string
  transaction_type: TransactionType
  shares: number | null
  price_per_share: number
  total_amount: number
  fees: number
  currency: string
  transaction_date: string
  cost_basis_at_sell?: number
  realized_gain_loss?: number
  realized_gain_loss_pct?: number
  notes?: string
  created_at: string
}

export interface TransactionsResponse {
  data: Transaction[]
  meta: PaginationMeta
}

export interface ClosedPosition {
  holding_id: string
  stock: Stock
  account_type: string
  total_shares_bought: number
  avg_buy_price: number
  total_shares_sold: number
  avg_sell_price: number
  total_realized_gain_loss: number
  total_realized_gain_loss_pct: number
  first_buy_date: string
  last_sell_date: string
}

export interface SellPreviewResponse {
  shares: number
  price_per_share: number
  realized_gain_loss: number
  realized_gain_loss_pct: number
  tax_impact: {
    capital_gain: number
    taxable_capital_gain: number
    estimated_tax: number
    marginal_rate: number
  } | null
  superficial_loss_warning: boolean
  superficial_loss_detail: string | null
}
