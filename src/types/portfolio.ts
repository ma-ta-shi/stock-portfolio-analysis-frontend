import type { components } from './openapi.gen'
import type { Stock } from './stock'
import type { AccountType } from './user'
import type { StockSnapshot } from '@/lib/stock-snapshot'

/**
 * View-models of the Portfolio screen: what `lib/portfolio-mappers.ts` builds from the API responses. Components read these,
 * never the raw responses, so units (fractions) and dates are fixed in one place. A value the API does not serve is `null`.
 */
type Api = components['schemas']

export type PortfolioAccountView = 'combined' | AccountType
export type TransactionType = Api['TransactionResponse']['transaction_type']

/** One holding in one account, with its position and the stock's call. Closed holdings have `is_active` false and no position. */
export interface Holding {
  holding_id: string
  stock: Stock
  account_type: AccountType
  shares: number
  /** Per share, in the stock's currency. */
  average_cost_basis: number
  /** In the stock's currency, for the shares held now. */
  total_book_cost: number
  total_book_cost_cad: number | null
  is_active: boolean
  total_realized_gain_loss: number
  total_dividends_received: number
  total_fees_paid: number
  total_shares_bought: number
  total_shares_sold: number
  average_buy_price: number | null
  average_sell_price: number | null
  first_buy_date: string | null
  last_transaction_date: string | null
  notes: string | null

  /** The close used to value the position (else the stock's newest close), in the stock's currency. */
  current_price: number | null
  price_day: string | null
  price_source: string | null
  /** Fractions. */
  change_day: number | null
  change_week: number | null
  change_month: number | null
  /** Shares x price, in the stock's currency (a display product; the backend's own value is `value_cad`). */
  market_value: number | null
  /** Market value less book cost, in the stock's currency. Derived; used by pages not yet on the backend's CAD gain. */
  total_gain_loss: number | null
  total_gain_loss_pct: number | null

  /** The backend's valuation, Canadian dollars. */
  value_cad: number | null
  cost_cad: number | null
  unrealised_cad: number | null
  /** The part of the unrealised gain that is the currency moving. */
  unrealised_fx_cad: number | null
  /** Fraction. */
  unrealised_pct: number | null
  /** Fraction of the portfolio. */
  weight: number | null

  /** Price, changes and the newest call; null only when the snapshot was not asked for. */
  call: StockSnapshot | null
  /** Expected dividends per share over the call's horizon, in the stock's currency. */
  expected_income_per_share: number | null
  /** Fractions: expected income over price, and over average cost. */
  dividend_yield: number | null
  yield_on_cost: number | null
}

export interface Transaction {
  transaction_id: string
  holding_id: string | null
  /** Null on a cash row (contribution, withdrawal, fee, conversion, interest, adjustment). */
  stock: Stock | null
  account_type: AccountType
  transaction_type: TransactionType
  shares: number | null
  price_per_share: number | null
  total_amount: number
  fees: number
  currency: 'CAD' | 'USD'
  /** The owner's day, as entered: no time zone. */
  transaction_date: string
  amount_cad: number | null
  fx_rate_to_cad: number | null
  fx_rate_date: string | null
  fx_rate_refreshed_at: string | null
  withholding_tax: number | null
  counter_currency: 'CAD' | 'USD' | null
  counter_amount: number | null
  fx_spread_cad: number | null
  tax_year: number
  in_kind: boolean
  initiated_by: 'owner' | 'system'
  reason_code: Api['TransactionResponse']['reason_code']
  recommendation_id: string | null
  denied_loss_cad: number | null
  denied_loss_lost_cad: number | null
  cost_removed_cad: number | null
  reverses_transaction_id: string | null
  supersedes_transaction_id: string | null
  /** The id of the row that reverses this one, when that row is among those loaded (the API does not say; gap P-T1). */
  reversed_by_transaction_id: string | null
  move_id: string | null
  cost_basis_at_sell: number | null
  realized_gain_loss: number | null
  /** Fraction. */
  realized_gain_loss_pct: number | null
  realized_gain_loss_cad: number | null
  fx_gain_loss_cad: number | null
  system_outlook_at_sell: string | null
  sell_aligned_with_system: boolean | null
  notes: string | null
  /** When the row was recorded (an instant, UTC). */
  created_at: string
}

export interface AccountBreakdown {
  value: number
  cost: number
  gain_loss: number
  /** Fraction. */
  gain_loss_pct: number | null
  cash_cad: number | null
}

/** One scope of the portfolio (the whole or one account), assembled from positions, the report, the value history, accounts and room. */
export interface PortfolioSummary {
  view: PortfolioAccountView
  /** The day of the prices behind the figures. */
  as_of: string
  total_value_cad: number
  cash_cad: number | null
  total_cost_cad: number
  total_gain_loss_cad: number
  /** Fraction of cost; null when no position is priced. */
  total_gain_loss_pct: number | null
  /** The change between the last two recorded days. */
  day_change_cad: number | null
  day_change_pct: number | null
  day_change_from: string | null
  day_change_to: string | null
  /** True when cash moved or trades happened between the two days, so the change is not only the market. */
  day_change_includes_flows: boolean
  sparkline_30d: number[]
  /** Tickers held with no recorded price (carried at cost). */
  unpriced: string[]
  by_account: Partial<Record<AccountType, AccountBreakdown>>
  report: Api['ScopeReportResponse'] | null
  /** The report's period and its own warnings, notes and what it narrowed (whole-portfolio, whatever the scope). */
  report_meta: Pick<Api['ReportResponse'], 'period' | 'warnings' | 'notes' | 'narrowed'> | null
  history: Api['ValueHistoryResponse'] | null
  accounts: Api['PortfolioAccountResponse'][]
  room: Api['RoomResponse'] | null
  /** Why the room could not be read (for example the profile figures it lacks), when that is the reason. */
  room_error: string | null
  /** The optional parts that failed to load, so the header says "unavailable" for those only. */
  unavailable: { report: boolean; history: boolean; accounts: boolean; room: boolean }
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
