/**
 * The header and its detail panels: the scope's value, the since-inception report (profit lines, tax, performance, benchmark
 * fund, money in and out), the value history, the accounts and the contribution room. `column` = a headline figure,
 * `detail` = a line in the performance panel, `csv` = not used here.
 */
import { defineFields, type ApiFieldKey, type NotShown } from '@/lib/fields'
import { formatCAD, formatDate, formatNumber, formatPct, formatPercent } from '@/lib/format'
import { asFraction } from '@/lib/units'
import type { components } from '@/types/openapi.gen'
import type { PortfolioSummary } from '@/types/portfolio'

type Api = components['schemas']

const cad = (v: unknown, signed = false) => formatCAD(v as number | null, { signed })
const day = (v: unknown) => (v ? formatDate(v as string) : '—')
const text = (v: unknown) => (v == null || v === '' ? '—' : String(v))
const yesNo = (v: unknown) => (v == null ? '—' : v ? 'Yes' : 'No')
const pct = (v: unknown) => formatPct(v as number | null)

type Profit = Api['ProfitLinesResponse']
const profit = (s: PortfolioSummary) => s.report?.profit
const performance = (s: PortfolioSummary) => s.report?.performance
const fund = (s: PortfolioSummary) => s.report?.performance.fund
const tax = (s: PortfolioSummary) => s.report?.tax

/** One line of the profit report in Canadian dollars, read from `report.profit`. */
function profitLine(key: keyof Profit, label: string, tooltip?: string, headline = false) {
  return {
    id: `profit_${key}`,
    label,
    source: `ProfitLinesResponse.${key}` as ApiFieldKey,
    get: (s: PortfolioSummary) => profit(s)?.[key],
    format: (v: unknown) => cad(v, key === 'profit_cad' || key.startsWith('realised') || key === 'unrealised_change_cad'),
    tooltip,
    places: headline ? (['column', 'detail'] as const) : (['detail'] as const),
  }
}

export const SUMMARY_FIELDS = defineFields<PortfolioSummary>([
  // Where the prices are from
  { id: 'as_of', label: 'Prices as of', source: 'ScopeValueResponse.day', get: (s) => s.as_of, format: day, places: ['column', 'detail'] },
  { id: 'value', label: 'Value (incl. cash)', source: 'ScopeValueResponse.value_cad', get: (s) => s.total_value_cad, format: (v) => cad(v), places: ['column', 'detail'] },
  { id: 'cash', label: 'Cash', source: 'ScopeValueResponse.cash_cad', get: (s) => s.cash_cad, format: (v) => cad(v), places: ['column', 'detail'] },
  { id: 'unrealised', label: 'Unrealised', source: 'ScopeValueResponse.unrealised_cad', get: (s) => s.total_gain_loss_cad, format: (v) => cad(v, true), places: ['column', 'detail'] },
  { id: 'unrealised_pct', label: 'Unrealised %', source: ['ScopeValueResponse.unrealised_cad', 'PositionLineResponse.cost_cad'], get: (s) => s.total_gain_loss_pct, format: pct, tooltip: 'Unrealised over the cost base of the positions', places: ['column', 'detail'] },
  { id: 'unpriced', label: 'Held with no price', source: 'ScopeValueResponse.unpriced', get: (s) => s.unpriced, format: (v) => ((v as string[]).length ? (v as string[]).join(', ') : 'None'), tooltip: 'Carried at cost, not at zero', places: ['detail'] },

  // Performance since the first entry (the report)
  { id: 'period', label: 'Period', source: ['PeriodResponse.label', 'PeriodResponse.start', 'PeriodResponse.end', 'PeriodResponse.tax_year'], get: (s) => s.report_meta?.period.label, format: text, places: ['detail'] },
  { id: 'period_days', label: 'Days', source: 'PerformanceResponse.days', get: (s) => performance(s)?.days, places: ['detail'] },
  { id: 'start_value', label: 'Value at start', source: 'PerformanceResponse.start_value', get: (s) => performance(s)?.start_value, format: (v) => cad(v), places: ['detail'] },
  { id: 'end_value', label: 'Value at end', source: 'PerformanceResponse.end_value', get: (s) => performance(s)?.end_value, format: (v) => cad(v), places: ['detail'] },
  { id: 'deposited', label: 'Deposited', source: 'PerformanceResponse.deposited', get: (s) => performance(s)?.deposited, format: (v) => cad(v), places: ['detail'] },
  { id: 'withdrawn', label: 'Withdrawn', source: 'PerformanceResponse.withdrawn', get: (s) => performance(s)?.withdrawn, format: (v) => cad(v), places: ['detail'] },
  { id: 'profit', label: 'Profit', source: 'PerformanceResponse.profit_cad', get: (s) => performance(s)?.profit_cad, format: (v) => cad(v, true), places: ['column', 'detail'] },
  { id: 'return_period', label: 'Return', source: 'PerformanceResponse.return_period', get: (s) => asFraction('PerformanceResponse.return_period', performance(s)?.return_period), format: pct, tooltip: 'Money-weighted: it accounts for when cash went in and out', places: ['column', 'detail'] },
  { id: 'return_annualised', label: 'Return per year', source: 'PerformanceResponse.return_annualised', get: (s) => asFraction('PerformanceResponse.return_annualised', performance(s)?.return_annualised), format: pct, places: ['column', 'detail'] },
  { id: 'return_reason', label: 'Why no return', source: 'PerformanceResponse.reason', get: (s) => performance(s)?.reason, format: text, places: ['detail'] },
  {
    id: 'flows',
    label: 'Money in and out',
    source: ['PerformanceResponse.flows', 'FlowResponse.day', 'FlowResponse.amount', 'FlowResponse.label'],
    get: (s) => performance(s)?.flows ?? [],
    format: (v) => ((v as Api['FlowResponse'][]).length ? (v as Api['FlowResponse'][]).map((f) => `${formatDate(f.day)} ${f.label} ${formatCAD(f.amount, { signed: true })}`).join('; ') : 'None'),
    places: ['detail'],
  },

  // Benchmark fund
  { id: 'fund_available', label: 'Benchmark fund', source: 'FundResultResponse.available', get: (s) => fund(s)?.available, format: (v, s) => (v ? 'Available' : `Unavailable: ${fund(s)?.reason ?? 'no reason given'} (P-D1)`), places: ['detail'] },
  { id: 'fund_reason', label: 'Why unavailable', source: 'FundResultResponse.reason', get: (s) => fund(s)?.reason, format: text, places: ['detail'] },
  { id: 'fund_end_value', label: 'Fund value', source: 'FundResultResponse.end_value', get: (s) => fund(s)?.end_value, format: (v) => cad(v), places: ['detail'] },
  { id: 'fund_units', label: 'Fund units', source: 'FundResultResponse.units', get: (s) => fund(s)?.units, format: (v) => (v == null ? '—' : formatNumber(v as number, 4)), places: ['detail'] },
  { id: 'fund_return', label: 'Fund return', source: 'FundResultResponse.return_period', get: (s) => asFraction('FundResultResponse.return_period', fund(s)?.return_period), format: pct, places: ['detail'] },
  { id: 'fund_dollars_added', label: 'Dollars added to the fund', source: 'FundResultResponse.dollars_added', get: (s) => fund(s)?.dollars_added, format: (v) => cad(v), places: ['detail'] },
  { id: 'fund_difference', label: 'Versus benchmark fund', source: 'FundResultResponse.return_difference', get: (s) => asFraction('FundResultResponse.return_difference', fund(s)?.return_difference), format: pct, tooltip: "Your period return less the fund's", places: ['column', 'detail'] },
  { id: 'fund_note', label: 'Fund note', source: 'FundResultResponse.note', get: (s) => fund(s)?.note, format: text, places: ['detail'] },

  // Profit lines
  profitLine('realised_cad', 'Realised', 'Gains less losses made by selling', true),
  profitLine('realised_gains_cad', 'Realised gains'),
  profitLine('realised_losses_cad', 'Realised losses'),
  profitLine('denied_loss_cad', 'Denied losses', 'Losses the superficial-loss rule does not allow now'),
  profitLine('denied_loss_lost_cad', 'Denied losses lost'),
  profitLine('realised_fx_part_cad', 'Of which currency'),
  profitLine('unrealised_change_cad', 'Change in unrealised'),
  profitLine('before_record_gain_cad', 'Gain before the record began'),
  profitLine('dividends_gross_cad', 'Dividends, gross'),
  profitLine('dividends_withheld_cad', 'Tax withheld on dividends'),
  profitLine('dividends_net_cad', 'Dividends received', 'After tax withheld', true),
  profitLine('interest_cad', 'Interest'),
  profitLine('fees_cad', 'Fees', undefined, true),
  profitLine('conversion_spread_cad', 'Currency conversion spread'),
  profitLine('commissions_cad', 'Commissions'),
  profitLine('contributions_cad', 'Contributions'),
  profitLine('withdrawals_cad', 'Withdrawals'),
  profitLine('adjustments_cad', 'Adjustments'),
  profitLine('explained_cad', 'Explained by the entries'),
  profitLine('profit_cad', 'Profit'),
  profitLine('unexplained_cad', 'Unexplained', 'What the entries do not account for; it should be zero'),

  // Estimated tax
  { id: 'tax_capital_gains', label: 'Capital gains tax (estimate)', source: 'TaxEstimateResponse.capital_gains_tax_cad', get: (s) => tax(s)?.capital_gains_tax_cad, format: (v) => cad(v), places: ['detail'] },
  { id: 'tax_taxable_gain', label: 'Taxable capital gain', source: 'TaxEstimateResponse.taxable_capital_gain_cad', get: (s) => tax(s)?.taxable_capital_gain_cad, format: (v) => cad(v), places: ['detail'] },
  { id: 'tax_dividend', label: 'Dividend tax (estimate)', source: 'TaxEstimateResponse.dividend_tax_cad', get: (s) => tax(s)?.dividend_tax_cad, format: (v) => cad(v), places: ['detail'] },
  { id: 'tax_interest', label: 'Interest tax (estimate)', source: 'TaxEstimateResponse.interest_tax_cad', get: (s) => tax(s)?.interest_tax_cad, format: (v) => cad(v), places: ['detail'] },
  { id: 'tax_total', label: 'Estimated tax', source: 'TaxEstimateResponse.total_cad', get: (s) => tax(s)?.total_cad, format: (v) => cad(v), places: ['column', 'detail'] },
  { id: 'tax_not_estimated', label: 'Not estimated', source: 'TaxEstimateResponse.not_estimated', get: (s) => tax(s)?.not_estimated ?? [], format: (v) => ((v as string[]).length ? (v as string[]).join('; ') : 'None'), places: ['detail'] },
  { id: 'tax_note', label: 'Tax note', source: 'TaxEstimateResponse.note', get: (s) => tax(s)?.note, format: text, places: ['detail'] },

  // The report's own warnings
  { id: 'report_warnings', label: 'Report warnings', source: ['ScopeReportResponse.warnings', 'PerformanceResponse.reason'], get: (s) => s.report?.warnings ?? [], format: (v) => ((v as string[]).length ? (v as string[]).join('; ') : 'None'), places: ['detail'] },
  { id: 'report_notes', label: 'Report notes', source: ['ReportResponse.notes', 'ReportResponse.warnings', 'ReportResponse.narrowed'], get: (s) => [...(s.report_meta?.notes ?? []), ...(s.report_meta?.warnings ?? []), ...(s.report_meta?.narrowed ?? [])], format: (v) => ((v as string[]).length ? (v as string[]).join('; ') : 'None'), places: ['detail'] },

  // Change at the last close (from the value history)
  {
    id: 'day_change',
    label: 'Change at last close',
    source: ['ValueHistoryResponse.points', 'ValuePointResponse.value_cad', 'ValuePointResponse.cost_cad', 'ValuePointResponse.cash_cad', 'ValuePointResponse.day'],
    get: (s) => s.day_change_cad,
    format: (v, s) => (v == null ? 'unavailable (P-D2)' : `${cad(v, true)} (${pct(s.day_change_pct)}) since ${day(s.day_change_from)}${s.day_change_includes_flows ? ', includes cash or trades' : ''}`),
    tooltip: 'The last two recorded days of the value history',
    places: ['column', 'detail'],
  },
  { id: 'history_warnings', label: 'Value history warnings', source: 'ValueHistoryResponse.warnings', get: (s) => s.history?.warnings ?? [], format: (v) => ((v as string[]).length ? (v as string[]).join('; ') : 'None'), places: ['detail'] },
])

/** One account's cash and broker settings (the account card). */
export const ACCOUNT_FIELDS = defineFields<Api['PortfolioAccountResponse']>([
  { id: 'type', label: 'Account', source: 'PortfolioAccountResponse.account_type', get: (a) => a.account_type.toUpperCase(), places: ['detail'] },
  { id: 'cash_cad', label: 'Cash (CAD)', source: 'PortfolioAccountResponse.cash_cad', get: (a) => a.cash_cad, format: (v) => cad(v), places: ['column', 'detail'] },
  { id: 'cash_usd', label: 'Cash (USD)', source: 'PortfolioAccountResponse.cash_usd', get: (a) => a.cash_usd, format: (v) => formatNumber(v as number | null), places: ['column', 'detail'] },
  { id: 'commission', label: 'Commission per trade', source: 'PortfolioAccountResponse.commission_per_trade', get: (a) => a.commission_per_trade, format: (v) => cad(v), places: ['detail'] },
  { id: 'conversion_cost', label: 'Currency conversion cost', source: 'PortfolioAccountResponse.conversion_cost_pct', get: (a) => asFraction('PortfolioAccountResponse.conversion_cost_pct', a.conversion_cost_pct), format: (v) => formatPercent(v as number | null), places: ['detail'] },
  { id: 'norberts', label: "Uses Norbert's gambit", source: 'PortfolioAccountResponse.uses_norberts_gambit', get: (a) => a.uses_norberts_gambit, format: yesNo, places: ['detail'] },
  { id: 'reinvests', label: 'Reinvests dividends', source: 'PortfolioAccountResponse.reinvests_dividends', get: (a) => a.reinvests_dividends, format: yesNo, places: ['detail'] },
  { id: 'updated', label: 'Settings changed', source: 'PortfolioAccountResponse.last_updated', get: (a) => a.last_updated, format: day, places: ['detail'] },
])

/** One account's contribution room (the room strip). TFSA and RRSP only; the Trading account has none. */
export const ROOM_FIELDS = defineFields<Api['AccountRoomResponse']>([
  { id: 'account', label: 'Account', source: 'AccountRoomResponse.account', get: (r) => r.account.toUpperCase(), places: ['detail'] },
  { id: 'room_today', label: 'Room today', source: 'AccountRoomResponse.room_today', get: (r) => r.room_today, format: (v) => cad(v), places: ['column', 'detail'] },
  { id: 'base_room', label: 'Room when entered', source: 'AccountRoomResponse.base_room', get: (r) => r.base_room, format: (v) => cad(v), places: ['detail'] },
  { id: 'base_as_of', label: 'Entered on', source: 'AccountRoomResponse.base_as_of', get: (r) => r.base_as_of, format: day, tooltip: 'A day as you wrote it', places: ['detail'] },
  { id: 'estimated', label: 'Estimated', source: 'AccountRoomResponse.estimated', get: (r) => r.estimated, format: yesNo, places: ['column', 'detail'] },
  { id: 'events', label: 'Changes since', source: 'AccountRoomResponse.events', get: (r) => r.events, format: (v) => `${(v as unknown[]).length}`, places: ['detail'] },
  { id: 'shortfalls', label: 'Shortfalls', source: 'AccountRoomResponse.shortfalls', get: (r) => r.shortfalls, format: (v) => `${(v as unknown[]).length}`, places: ['detail'] },
])

export const ROOM_EVENT_FIELDS = defineFields<Api['RoomEventResponse']>([
  { id: 'when', label: 'When', source: 'RoomEventResponse.when', get: (e) => e.when, format: day, places: ['column'] },
  { id: 'kind', label: 'What', source: 'RoomEventResponse.kind', get: (e) => e.kind, format: (v) => String(v).replaceAll('_', ' '), places: ['column'] },
  { id: 'change', label: 'Change', source: 'RoomEventResponse.change', get: (e) => e.change, format: (v) => cad(v, true), places: ['column'] },
  { id: 'room_after', label: 'Room after', source: 'RoomEventResponse.room_after', get: (e) => e.room_after, format: (v) => cad(v), places: ['column'] },
  { id: 'detail', label: 'Detail', source: 'RoomEventResponse.detail', get: (e) => e.detail, places: ['column'] },
])

export const SUMMARY_NOT_SHOWN: Partial<Record<ApiFieldKey, NotShown>> = {
  'PositionsResponse.portfolio_id': { reason: 'An id of the portfolio the page is already in' },
  'PositionsResponse.total': { reason: "Shown through the scope's own fields (ScopeValueResponse)" },
  'PositionsResponse.accounts': { reason: "Shown through the scope's own fields (ScopeValueResponse)" },
  'PositionsResponse.confirmations': { reason: "Shown on each holding and account through ConfirmationResponse's fields" },
  'ScopeValueResponse.positions': { reason: "Each position is a row of the Holdings table, shown through PositionLineResponse's fields" },
  'ScopeReportResponse.name': { reason: 'The scope key (total, an account): the page already knows it' },
  'ScopeReportResponse.level': { reason: 'The scope level (total, account, stock): the page already knows it' },
  'ScopeReportResponse.start': { reason: "The value at the period's start: restated by PerformanceResponse.start_value" },
  'ScopeReportResponse.end': { reason: "The value at the period's end: restated by PerformanceResponse.end_value" },
  'ScopeReportResponse.profit': { reason: "Shown through ProfitLinesResponse's fields" },
  'ScopeReportResponse.tax': { reason: "Shown through TaxEstimateResponse's fields" },
  'ScopeReportResponse.performance': { reason: "Shown through PerformanceResponse's fields" },
  'PerformanceResponse.start': { reason: "The period's start, shown through PeriodResponse" },
  'PerformanceResponse.end': { reason: "The period's end, shown through PeriodResponse" },
  'PerformanceResponse.fund': { reason: "Shown through FundResultResponse's fields" },
  'ReportResponse.period': { reason: "Shown through PeriodResponse's fields" },
  'ReportResponse.total': { reason: "Shown through ScopeReportResponse's fields" },
  'ReportResponse.accounts': { reason: "Shown through ScopeReportResponse's fields, one per account" },
  'ReportResponse.tax_year_refund': { reason: 'An untyped record in the API', gap: 'P-F2' },
  'ReportResponse.stocks': { reason: 'The holdings already carry each stock figure; a per-stock report is a Reports view', gap: 'P-F1' },
  'ReportResponse.who_and_why': { reason: 'A Reports view feature', gap: 'P-F1' },
  'ReportResponse.breakdowns': { reason: 'A Reports view feature', gap: 'P-F1' },
  'ReportResponse.actions': { reason: 'The Transactions tab lists the same entries', gap: 'P-F1' },
  'ReportResponse.actions_total': { reason: 'The Transactions tab pages the same entries', gap: 'P-F1' },
  'ValuePointResponse.positions_cad': { reason: 'The sparkline plots the total value only; the split of a day into positions and cash is not drawn' },
  'ValuePointResponse.unpriced': { reason: "A day's unpriced holdings are not shown; the header warns about today's (ScopeValueResponse.unpriced)" },
  'PortfolioResponse.name': { reason: 'The page title is fixed ("Portfolio"); the portfolio id is what the requests use' },
  'ValueHistoryResponse.portfolio_id': { reason: 'Echoes the request' },
  'ValueHistoryResponse.start': { reason: 'Echoes the request' },
  'ValueHistoryResponse.end': { reason: 'Echoes the request' },
  'ValueHistoryResponse.account': { reason: 'Echoes the request' },
  'PortfolioAccountResponse.account_id': { reason: 'An id' },
  'PortfolioAccountResponse.portfolio_id': { reason: 'An id of the portfolio the page is already in' },
  'PortfolioResponse.portfolio_id': { reason: 'An id: the key of every portfolio request' },
  'PortfolioResponse.user_id': { reason: 'An id of the active user' },
  'PortfolioResponse.kind': { reason: "Chooses the owner's portfolio over the read-only agent one; not a figure" },
  'PortfolioResponse.settings': { reason: "The portfolio's optimizer rules, edited in Settings", gap: 'P-S1' },
  'PortfolioResponse.is_active': { reason: 'An archived portfolio is not listed' },
  'PortfolioResponse.created_at': { reason: 'Record bookkeeping' },
  'RoomResponse.portfolio_id': { reason: 'An id of the portfolio the page is already in' },
  'RoomResponse.as_of': { reason: 'The day the room was worked out: today' },
  'RoomResponse.accounts': { reason: "Shown through AccountRoomResponse's fields, one per account" },
}
