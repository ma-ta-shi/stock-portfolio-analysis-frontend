/**
 * The Portfolio screen's one conversion point: API responses in, view-models (`types/portfolio.ts`) out. Every ratio goes
 * through `asFraction` and the stock's call through `stock-snapshot.ts`; components never read a raw response. What each
 * API field becomes on screen is declared in `src/screens/portfolio/`.
 */
import { ACCOUNT_TYPES } from './accounts'
import { mapStock, mapStockSnapshot } from './stock-snapshot'
import { asFraction } from './units'
import type { components } from '@/types/openapi.gen'
import type {
  AccountBreakdown,
  Holding,
  PortfolioAccountView,
  PortfolioSummary,
  Transaction,
} from '@/types/portfolio'
import type { AccountType } from '@/types/user'

type Api = components['schemas']
export type ApiHolding = Api['HoldingResponse']
export type ApiTransaction = Api['TransactionResponse']
export type ApiPositions = Api['PositionsResponse']
type ApiScope = Api['ScopeValueResponse']


export function mapHolding(h: ApiHolding): Holding {
  const call = h.snapshot ? mapStockSnapshot(h.snapshot) : null
  const position = h.position ?? null
  const price = position?.price ?? call?.price ?? null
  const marketValue = h.is_active && price != null ? h.shares * price : null
  const gain = marketValue != null ? marketValue - h.total_book_cost : null
  const income = call?.analysis?.incomePerShare ?? null
  return {
    holding_id: h.holding_id,
    stock: mapStock(h.stock),
    account_type: h.account_type,
    shares: h.shares,
    average_cost_basis: h.average_cost_basis,
    total_book_cost: h.total_book_cost,
    total_book_cost_cad: h.total_book_cost_cad ?? null,
    is_active: h.is_active,
    total_realized_gain_loss: h.total_realized_gain_loss,
    total_dividends_received: h.total_dividends_received,
    total_fees_paid: h.total_fees_paid,
    total_shares_bought: h.total_shares_bought,
    total_shares_sold: h.total_shares_sold,
    average_buy_price: h.average_buy_price ?? null,
    average_sell_price: h.average_sell_price ?? null,
    first_buy_date: h.first_buy_date ?? null,
    last_transaction_date: h.last_transaction_date ?? null,
    notes: h.notes ?? null,

    current_price: price,
    price_day: position?.price_day ?? call?.priceDay ?? null,
    price_source: position?.price_source ?? null,
    change_day: call?.changeDay ?? null,
    change_week: call?.changeWeek ?? null,
    change_month: call?.changeMonth ?? null,
    market_value: marketValue,
    total_gain_loss: gain,
    total_gain_loss_pct: gain != null && h.total_book_cost > 0 ? gain / h.total_book_cost : null,

    value_cad: position?.value_cad ?? null,
    cost_cad: position?.cost_cad ?? null,
    unrealised_cad: position?.unrealised_cad ?? null,
    unrealised_fx_cad: position?.unrealised_fx_cad ?? null,
    unrealised_pct: asFraction('PositionLineResponse.unrealised_pct', position?.unrealised_pct),
    weight: asFraction('PositionLineResponse.weight_pct', position?.weight_pct),

    call,
    expected_income_per_share: income,
    dividend_yield: income != null && price != null && price > 0 ? income / price : null,
    yield_on_cost: income != null && h.average_cost_basis > 0 ? income / h.average_cost_basis : null,
  }
}

export function mapHoldings(rows: readonly ApiHolding[]): Holding[] {
  return rows.map((row) => mapHolding(row))
}

export function mapTransaction(t: ApiTransaction): Transaction {
  return {
    transaction_id: t.transaction_id,
    holding_id: t.holding_id ?? null,
    stock: t.stock ? mapStock(t.stock) : null,
    account_type: t.account_type,
    transaction_type: t.transaction_type,
    shares: t.shares ?? null,
    price_per_share: t.price_per_share ?? null,
    total_amount: t.total_amount,
    fees: t.fees,
    currency: t.currency,
    transaction_date: t.transaction_date,
    amount_cad: t.amount_cad ?? null,
    fx_rate_to_cad: t.fx_rate_to_cad ?? null,
    fx_rate_date: t.fx_rate_date ?? null,
    fx_rate_refreshed_at: t.fx_rate_refreshed_at ?? null,
    withholding_tax: t.withholding_tax ?? null,
    counter_currency: t.counter_currency ?? null,
    counter_amount: t.counter_amount ?? null,
    fx_spread_cad: t.fx_spread_cad ?? null,
    tax_year: t.tax_year,
    in_kind: t.in_kind,
    initiated_by: t.initiated_by,
    reason_code: t.reason_code ?? null,
    denied_loss_cad: t.denied_loss_cad ?? null,
    denied_loss_lost_cad: t.denied_loss_lost_cad ?? null,
    cost_removed_cad: t.cost_removed_cad ?? null,
    reverses_transaction_id: t.reverses_transaction_id ?? null,
    supersedes_transaction_id: t.supersedes_transaction_id ?? null,
    reversed_by_transaction_id: null,
    move_id: t.move_id ?? null,
    cost_basis_at_sell: t.cost_basis_at_sell ?? null,
    realized_gain_loss: t.realized_gain_loss ?? null,
    realized_gain_loss_pct: asFraction('TransactionResponse.realized_gain_loss_pct', t.realized_gain_loss_pct),
    realized_gain_loss_cad: t.realized_gain_loss_cad ?? null,
    fx_gain_loss_cad: t.fx_gain_loss_cad ?? null,
    system_outlook_at_sell: t.system_outlook_at_sell ?? null,
    sell_aligned_with_system: t.sell_aligned_with_system ?? null,
    notes: t.notes ?? null,
    created_at: t.created_at,
  }
}

/** Maps a list and marks each row that a later row in the list reverses (the API does not say; gap P-T1). */
export function mapTransactions(rows: readonly ApiTransaction[]): Transaction[] {
  const reversedBy = new Map<string, string>()
  for (const row of rows) if (row.reverses_transaction_id) reversedBy.set(row.reverses_transaction_id, row.transaction_id)
  return rows.map((row) => ({ ...mapTransaction(row), reversed_by_transaction_id: reversedBy.get(row.transaction_id) ?? null }))
}

function scopeOf(positions: ApiPositions, view: PortfolioAccountView): ApiScope | undefined {
  return view === 'combined' ? positions.total : positions.accounts[view]
}

function breakdown(scope: ApiScope | undefined): AccountBreakdown | undefined {
  if (!scope) return undefined
  const cost = scope.positions.reduce((sum, p) => sum + p.cost_cad, 0)
  return {
    value: scope.value_cad,
    cost,
    gain_loss: scope.unrealised_cad,
    gain_loss_pct: cost > 0 ? scope.unrealised_cad / cost : null,
    cash_cad: scope.cash_cad ?? null,
  }
}

export interface SummaryParts {
  view: PortfolioAccountView
  positions: ApiPositions
  report: Api['ReportResponse'] | null
  history: Api['ValueHistoryResponse'] | null
  accounts: Api['PortfolioAccountResponse'][] | null
  room: Api['RoomResponse'] | null
  roomError?: string | null
}

/** The header's figures for one scope. The optional parts (report, history, accounts, room) may be missing and are then flagged, not guessed. */
export function buildSummary({ view, positions, report, history, accounts, room, roomError = null }: SummaryParts): PortfolioSummary {
  const scope = scopeOf(positions, view)
  if (!scope) throw new Error(`The positions response has no ${view} scope`)
  const cost = scope.positions.reduce((sum, p) => sum + p.cost_cad, 0)
  const points = history?.points ?? []
  const [prev, last] = points.slice(-2)
  // `net_flow_cad` (cash added or taken out that day) is requested from the backend (gap P-D2); until it is served the change is flagged when the cost base or cash moved.
  const flow = last ? (last as { net_flow_cad?: number }).net_flow_cad : undefined
  const change = prev && last ? last.value_cad - prev.value_cad - (flow ?? 0) : null
  const byAccount: Partial<Record<AccountType, AccountBreakdown>> = {}
  for (const account of ACCOUNT_TYPES) byAccount[account] = breakdown(positions.accounts[account])
  return {
    view,
    as_of: scope.day,
    total_value_cad: scope.value_cad,
    cash_cad: scope.cash_cad ?? null,
    total_cost_cad: cost,
    total_gain_loss_cad: scope.unrealised_cad,
    total_gain_loss_pct: cost > 0 ? scope.unrealised_cad / cost : null,
    day_change_cad: change,
    day_change_pct: change != null && prev && prev.value_cad > 0 ? change / prev.value_cad : null,
    day_change_from: prev?.day ?? null,
    day_change_to: last?.day ?? null,
    day_change_includes_flows: prev && last ? flow === undefined && (prev.cost_cad !== last.cost_cad || prev.cash_cad !== last.cash_cad) : false,
    sparkline_30d: points.map((p) => p.value_cad),
    unpriced: scope.unpriced,
    by_account: byAccount,
    report: report ? (view === 'combined' ? report.total : (report.accounts[view] ?? null)) : null,
    report_meta: report ? { period: report.period, warnings: report.warnings, notes: report.notes, narrowed: report.narrowed } : null,
    history,
    accounts: accounts ?? [],
    room,
    room_error: roomError,
    unavailable: { report: report == null, history: history == null, accounts: accounts == null, room: room == null },
  }
}

/** What the held stocks are expected to pay over the next 12 months, in Canadian dollars: expected income per share x the position's value / price. */
export function annualIncomeEstimateCad(holdings: readonly Holding[], view: PortfolioAccountView): number | null {
  let total = 0
  let any = false
  for (const h of holdings) {
    if (!h.is_active || (view !== 'combined' && h.account_type !== view)) continue
    if (h.expected_income_per_share == null || h.value_cad == null || !h.current_price) continue
    total += (h.expected_income_per_share * h.value_cad) / h.current_price
    any = true
  }
  return any ? total : null
}

/** The account the switcher selects as an API filter: none for the whole portfolio. */
export function accountParam(view: PortfolioAccountView): AccountType | undefined {
  return view === 'combined' ? undefined : view
}
