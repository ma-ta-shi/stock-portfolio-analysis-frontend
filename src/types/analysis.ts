export interface HoldingSnapshot {
  shares: number
  average_cost: number
  book_cost: number
  current_value: number
  total_return_cad: number
  total_return_pct: number
  day_change_cad: number
  dividend_income_ytd?: number
  yield_on_cost?: number
  by_account?: { account_type: string; shares: number; value: number; avg_cost: number }[]
}

export interface StockFundamentals {
  pe_ratio?: number
  forward_pe?: number
  ev_ebitda?: number
  price_to_book?: number
  price_to_sales?: number
  revenue_growth_yoy?: number
  earnings_growth_yoy?: number
  gross_margin?: number
  net_margin?: number
  roe?: number
  debt_to_equity?: number
  beta?: number
  week_52_high?: number
  week_52_low?: number
  dividend_yield_trailing?: number
  business_description?: string
}
