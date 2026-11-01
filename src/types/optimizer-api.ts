// Generated from the backend's OpenAPI schema (backend/src/api/schemas/optimizer.py, monthly_plan.py,
// portfolio_reports.py) so these types mirror the Pydantic models. A proposal has no model confidence: its value is
// the benefit over a number of years against its costs and the noise margin of the views behind it. The CIO's words
// (`ViewNoteResponse`) are for information only.
// Regenerate after a schema change; do not edit by hand.

import type { PaginationMeta } from './api'

/** Every holding, watchlist name and fund in each account, with its predicted-return lines, the cost of a trade and its score, and the market line each is measured against. */
export interface AccountMatrixResponse {
  portfolio_id: string
  run_id: string | null
  as_of: string
  cells: MatrixCellResponse[]
  market_lines: Record<string, MarketLineResponse>
  parameters: Record<string, unknown>
  warnings: string[]
}

export interface AccountPlanResponse {
  account: string
  amount_cad: number
  cash_cad: number
  cash_usd: number
  to_deploy_cad: number
  room_before: number | null
  room_after: number | null
  room_estimated: boolean
}

/** Where should this money go: the top three investments with their orders. Saved as an inquiry only when `store` is true; an inquiry never replaces a run and is never mirrored to the agent portfolio. */
export interface AskCreate {
  amount_cad: number
  account?: 'tfsa' | 'rrsp' | 'trading' | null
  allow_stale?: boolean
  store?: boolean
}

/** What the benchmark fund earns in an account after costs: the line a stock is measured against. */
export interface BenchmarkLineResponse {
  account: string
  return_pct: number | null
  listing: string | null
  runner_up: string | null
  margin_pts: number | null
  break_even_conversion_pct: number | null
  components: Record<string, Record<string, unknown>>
  unavailable: Record<string, string>
  as_of: string | null
  stale: boolean
  reason: string | null
}

export interface BookAccountResponse {
  account: string
  value_cad: number
  cash_cad: number
  other_funds_cad: number
  new_money_cad: number
  new_money_placed_cad: number
  capacity: number
  stocks: number
  fund: number
  fund_listing: string | null
  full: boolean
  capacity_after: number
}

export interface BookLineResponse {
  ticker: string
  status: string
  weights: Record<string, number>
  total: number
  current: Record<string, number>
  current_total: number
  cap: number | null
  sector: string | null
  industry_group: string | null
  moves_with: string[]
  score: number | null
  expected: number | null
  anchor: number | null
  certain: number | null
  view: number | null
  cost: number | null
  edge: number | null
  beta: number | null
  vol: number | null
  resid_vol: number | null
  best_account: string | null
  location_advantage: number | null
  binding: string[]
  exclusions: string[]
  waiting_for_analysis: boolean
  by_account: Record<string, unknown>
  notes: string[]
  tier?: string | null
  view_jump_steps?: number | null
  view_unstable?: boolean
}

export interface CapViewResponse {
  name: string
  kind: string
  account: string | null
  exposure_cad: number
  cap_cad: number
  share_of_cap: number
}

export interface DriftViewResponse {
  account: string
  ticker: string
  held_cad: number
  target_cad: number
  ratio: number | null
  status: string
}

export interface ExcludedViewResponse {
  ticker: string
  reasons: string[]
}

export interface FundOrderResponse {
  account: string
  ticker: string
  shares: number
  price: number
  currency: string
  estimated_cost: number
  estimated_cost_cad: number
  commission_cad: number
  conversion_cost_cad: number
  leftover_cad: number
  reason: string
}

export interface MarketLineResponse {
  twelve_month: number | null
  holding: number | null
  listing_12m?: string | null
  listing_holding?: string | null
}

export interface MatrixCellResponse {
  ticker: string
  account: string
  kind: string
  held: boolean
  currency: string
  status: string
  reason: string | null
  flags: string[]
  usable: boolean
  exclusions: string[]
  price_change?: number | null
  income_yield?: number | null
  total_return_quote?: number | null
  baseline_own?: number | null
  baseline_cad?: number | null
  view?: number | null
  view_applied?: number | null
  view_scored?: number | null
  currency_line?: number | null
  total_return_cad?: number | null
  tax_rate_pct?: number | null
  annual_tax?: number | null
  fee?: number | null
  after_tax_12m?: number | null
  gain_tax_drag?: number | null
  after_tax_deferred?: number | null
  entry_cost?: number | null
  entry_cost_spread?: number | null
  exit_tax_cad?: number | null
  exit_cost?: number | null
  sigma?: number | null
  noise_margin_pts?: number | null
  market_line_12m?: number | null
  market_line_holding?: number | null
  score_12m?: number | null
  score_holding?: number | null
  tax_mode?: string | null
  fit?: string | null
  efficiency?: string | null
}

/** "I have this much to invest." The amount may be zero (the plan then shows the year as it stands); an amount below zero is refused by the service (INVALID_SURPLUS). With `account` the whole amount is for that account only. */
export interface MonthlyPlanRequest {
  amount_cad: number
  account?: 'tfsa' | 'rrsp' | 'trading' | null
}

/** The answer to "I have this much to invest". Advice only: nothing in it is invested or recorded. */
export interface MonthlyPlanResponse {
  portfolio_id: string
  as_of: string
  amount_cad: number
  account: string | null
  tax_year: number
  income: number
  income_source: string
  rrsp: RrspAmountResponse
  deducted_so_far: number
  rrsp_months: number
  rrsp_since: string | null
  rrsp_suggested: number
  rrsp_year: RrspYearResponse
  split: SplitResponse
  unplaced_cad: number
  accounts: Record<string, AccountPlanResponse>
  reasons: string[]
  warnings: string[]
  income_final: boolean
  income_notes: string[]
  benchmark?: Record<string, BenchmarkLineResponse>
  fund_orders?: FundOrderResponse[]
  waiting?: WaitingResponse[]
}

/** One step of a run: an order to place, or a transfer between the owner's own accounts. */
export interface OrderViewResponse {
  proposal_id: string | null
  sequence: number
  kind: string
  status: string
  followed_by: string | null
  account: string
  to_account: string | null
  ticker: string | null
  side: string
  shares: number | null
  price: number | null
  currency: string | null
  amount_cad: number
  rule: string
  rule_text: string
  chain: string | null
  reasons: ReasonLineResponse[]
  costs: Record<string, unknown>
  value: Record<string, unknown>
  rebuy_not_before: string | null
  what_would_change: string[]
  view: ViewNoteResponse | null
}

/** Ask for a fresh look at the portfolio. Nothing is saved unless `store` is true, and saving replaces the portfolio's open proposals (their ids are listed in the answer). `allow_stale` weights a name whose only fault is an analysis over a week old; the answer is then marked a dry run. */
export interface ProposalRunCreate {
  store?: boolean
  allow_stale?: boolean
}

/** How much cash is needed in hand. */
export interface RaiseCashRequest {
  amount_cad: number
}

/** The cheapest way to raise cash. Advice only: nothing in it is sold, recorded or created. */
export interface RaiseCashResponse {
  portfolio_id: string
  as_of: string
  amount_cad: number
  steps: RaiseOptionResponse[]
  covered_cad: number
  shortfall_cad: number
  total_cost_cad: number
  options: RaiseOptionResponse[]
  warnings: string[]
  notes: string[]
}

/** One way to raise cash. A sale is whole shares; `net_cad` is what reaches the owner's hands. */
export interface RaiseOptionResponse {
  rank: number
  account: string
  source: string
  ticker: string | null
  currency: string | null
  shares: number | null
  price: number | null
  gross_cad: number
  net_cad: number
  capacity_net_cad: number
  tax_cost_cad: number
  withholding_cad: number
  commission_cad: number
  conversion_cost_cad: number
  gain_cad: number | null
  cost_per_dollar: number
  room_consequence: string
  room_used_cad: number
  room_returns_on: string | null
  weight_pct: number | null
  target_book_effect: string
  recommended: boolean
  warnings: string[]
  notes: string[]
}

export interface ReasonLineResponse {
  text: string
  field: string | null
  value: number | null
}

export interface ReportBlockResponse {
  caps: CapViewResponse[]
  currency_share: Record<string, unknown>
  room: Record<string, unknown>
  ytd_gain_cad: number | null
  run_sale_tax_cad: number | null
  harvest: Record<string, unknown>[]
  excluded: ExcludedViewResponse[]
  parked_share: number | null
  fund_by_account: Record<string, unknown>
  unfilled: Record<string, unknown>[]
  breaches: string[]
  view_notes: ViewNoteResponse[]
}

export interface RrspAmountResponse {
  a: number
  edge_total: number
  edge_left: number
  cap_left: number | null
  room_left: number
  binding: string
}

export interface RrspYearResponse {
  target: number
  paid: number
  to_target: number
  can_still_claim: number
  needed_per_month: number
  on_pace: number
  behind_by: number
  tax_saved_so_far: number
  tax_saved_this_amount: number
  tax_saved_at_target: number
}

export interface RunListResponse {
  data: RunSummaryResponse[]
  meta: PaginationMeta
}

export interface RunSummaryResponse {
  run_id: string
  kind: string
  as_of: string
  created_at: string
  orders: number
  transfers: number
  waiting: number
  no_changes: boolean
  matrix_stored: boolean
}

export interface RunViewResponse {
  run_id: string | null
  portfolio_id: string
  kind: string
  as_of: string
  created_at: string | null
  stored: boolean
  dry_run: boolean
  settings: Record<string, unknown>
  headline: string
  no_changes: boolean
  orders: OrderViewResponse[]
  transfers: OrderViewResponse[]
  waiting: WaitingViewResponse[]
  drift: DriftViewResponse[]
  warnings: string[]
  report: ReportBlockResponse
  missing: string[]
  superseded_proposal_ids: string[]
}

export interface SplitResponse {
  rrsp: number
  tfsa: number
  trading: number
}

/** What to hold and where, and the reason for each choice. The decision rules compare it with what is held. */
export interface TargetBookResponse {
  portfolio_id: string
  run_id: string | null
  as_of: string
  total_value_cad: number
  stock_share: number
  parked: number
  expected_return: number
  volatility: number
  tracking_volatility: number
  benchmark_return: Record<string, number>
  certain_part: number
  view_part: number
  risk_aversion: number
  benchmark_vol: number
  dropped: string[]
  breaches: string[]
  registered: Record<string, unknown>
  moves: Record<string, unknown> | null
  accounts: BookAccountResponse[]
  lines: BookLineResponse[]
  parameters: Record<string, unknown>
  warnings: string[]
}

/** The CIO's words and labels for a name, kept with the run. For information only. */
export interface ViewNoteResponse {
  ticker: string
  outlook: string | null
  confidence: number | null
  tier: string | null
  reason_text: string
  dissent_text: string
  falsifier_text: string
  falsifier: Record<string, unknown> | null
  flags: string[]
  status: string | null
  exclusions: string[]
}

export interface WaitingResponse {
  account: string
  ticker: string
  available_cad: number
  needs_more_cad: number
  reason: string
}

export interface WaitingViewResponse {
  account: string
  ticker: string | null
  side: string
  amount_cad: number
  rule: string
  rule_text: string
  reason: string
}
