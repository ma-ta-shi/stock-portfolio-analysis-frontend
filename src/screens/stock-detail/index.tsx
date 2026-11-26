/**
 * The Stock page's own reads: the stock's directory row, its stored prices and fundamentals, and its past analyses with their
 * predictions. The latest call is the shared set (`../stock`), which the history rows draw from too.
 * Fundamentals: `column` is the metrics bar, `detail` the "More fundamentals" grid.
 */
import { CallHeadline } from '@/components/StockCall'
import { defineFields, type ApiFieldKey, type NotShown, type ScreenFieldSet } from '@/lib/fields'
import { formatNumber, formatPct, formatPercent } from '@/lib/format'
import { unavailableLabel } from '@/lib/gaps'
import { gainLossColor } from '@/lib/labels'
import { historyReturn, predictionState, type HistoryRow } from '@/lib/stock-detail'
import { cn } from '@/lib/utils'
import type { StockFundamentals } from '@/types/analysis'
import { signedPct } from '../formatters'
import { confidenceCell, dash, money, stockField } from '../stock'

const number = (decimals: number) => (value: unknown) => (value == null ? '—' : (value as number).toFixed(decimals))
const percent = (value: unknown) => formatPct(value as number | null | undefined, 1)
const bar = ['column' as const]
const more = ['detail' as const]

export const FUNDAMENTAL_FIELDS = defineFields<StockFundamentals>([
  { id: 'pe', label: 'P/E', source: 'ValuationFacts.pe_ratio', get: (f) => f.pe_ratio, format: number(1), places: bar },
  { id: 'forward_pe', label: 'P/E (FY est.)', source: 'ValuationFacts.forward_pe', get: (f) => f.forward_pe, format: number(1), places: bar },
  { id: 'ev_ebitda', label: 'EV/EBITDA', source: 'ValuationFacts.ev_ebitda', get: (f) => f.ev_ebitda, format: number(1), places: bar },
  { id: 'div_yield', label: 'Div Yield', source: 'DividendFacts.dividend_yield', get: (f) => f.dividend_yield_trailing, format: (v) => ((v as number) > 0 ? formatPercent(v as number) : '—'), places: bar },
  { id: 'beta', label: 'Beta', source: 'RiskFacts.beta', get: (f) => f.beta, format: number(2), places: bar },
  { id: 'pb', label: 'P/B', source: 'ValuationFacts.pb_ratio', get: (f) => f.price_to_book, format: number(1), places: more },
  { id: 'ps', label: 'P/S', source: 'ValuationFacts.ps_ratio', get: (f) => f.price_to_sales, format: number(1), places: more },
  { id: 'roe', label: 'ROE', source: 'ProfitabilityFacts.roe', get: (f) => f.roe, format: percent, places: more },
  { id: 'revenue_growth', label: 'Rev Growth', source: 'GrowthFacts.revenue_growth_yoy', get: (f) => f.revenue_growth_yoy, format: percent, places: more },
  { id: 'eps_growth', label: 'EPS Growth', source: 'GrowthFacts.eps_growth_yoy', get: (f) => f.earnings_growth_yoy, format: percent, places: more },
  { id: 'gross_margin', label: 'Gross Margin', source: 'ProfitabilityFacts.gross_margin', get: (f) => f.gross_margin, format: percent, places: more },
  { id: 'net_margin', label: 'Net Margin', source: 'ProfitabilityFacts.net_margin', get: (f) => f.net_margin, format: percent, places: more },
  { id: 'de', label: 'D/E', source: 'BalanceSheetFacts.debt_to_equity', get: (f) => f.debt_to_equity, format: number(1), places: more },
  { id: 'week_52', label: '52-Week Range', source: ['PriceFacts.high_52w', 'PriceFacts.low_52w'], get: (f) => f.week_52_high, format: (v, f) => (v == null ? '—' : `${formatNumber(f.week_52_low ?? null)} to ${formatNumber(v as number)}`), places: bar },
])

const returns = (r: HistoryRow) => (r.returnLow == null ? '—' : `${signedPct(r.returnLow)} to ${signedPct(r.returnHigh)}`)

/** The history table: the original columns, and the rest of what a past run holds in the expanded row. */
export const HISTORY_FIELDS = defineFields<HistoryRow>([
  stockField('call_as_of', { label: 'Date', places: ['column'] }),
  // wraps, as Account and Timeline below, so the narrow page keeps Return and View in sight
  stockField('outlook', { places: ['column'], render: (r) => <span className="inline-block max-w-32 whitespace-normal leading-tight"><CallHeadline analysis={r.call?.analysis} /></span> }),
  stockField('confidence', { places: ['column'], render: confidenceCell }),
  {
    id: 'price_at_analysis',
    label: 'Price',
    source: 'PredictionResponse.price_at_recommendation',
    get: (r) => r.priceAtAnalysis,
    format: (v, r) => money(r, v),
    tooltip: 'The price when the analysis was made',
    places: ['column'],
  },
  {
    id: 'account',
    label: 'Account',
    source: [],
    get: () => null,
    format: () => unavailableLabel('S-3'),
    places: ['column'],
    render: () => <span className="inline-block max-w-20 whitespace-normal text-xs leading-tight text-muted-foreground">{unavailableLabel('S-3')}</span>,
  },
  { id: 'timeline', label: 'Timeline', source: 'AnalysisRunSummary.timeline', get: (r) => r.timeline, format: (v) => String(v).replaceAll('_', ' '), places: ['column'], render: (r) => <span className="inline-block max-w-16 whitespace-normal leading-tight">{r.timeline.replaceAll('_', ' ')}</span> },
  {
    id: 'prediction',
    label: 'Prediction',
    source: 'PredictionCheckpointResponse.status',
    get: (r) => predictionState(r),
    format: (v) => (v === 'resolved' ? 'Resolved' : v === 'pending' ? 'Pending' : '—'),
    places: ['column'],
  },
  {
    id: 'return',
    label: 'Return',
    source: ['PredictionCheckpointResponse.actual_total_return_pct', 'PredictionCheckpointResponse.interval'],
    get: (r) => historyReturn(r),
    format: (v) => (v == null ? '—' : formatPct(v as number, 1)),
    tooltip: 'Total return 3 months after the analysis, or 1 month while the 3 month result is not in',
    places: ['column'],
    render: (r) => {
      const value = historyReturn(r)
      return value == null ? dash : <span className={cn('font-medium', gainLossColor(value))}>{formatPct(value, 1)}</span>
    },
  },
  stockField('tier', { places: ['detail'] }),
  stockField('expected_return', { places: ['detail'] }),
  {
    id: 'return_range',
    label: 'Expected return range',
    source: ['AnalysisRunSummary.expected_return_low', 'AnalysisRunSummary.expected_return_high'],
    get: (r) => r.returnLow,
    format: (_v, r) => returns(r),
    places: ['detail'],
  },
  stockField('disagreement', { places: ['detail'] }),
])

const repeats = 'Repeats the stock the page is about'
const call = 'The same figure the call shows from the shared fields (../stock)'
const missing = { reason: 'Not in the original design', gap: 'S-9' as const }

export const STOCK_DETAIL_NOT_SHOWN: Partial<Record<ApiFieldKey, NotShown>> = {
  'StockResponse.stock_id': { reason: 'An id: the route of the page' },
  'StockResponse.ticker': { reason: 'Shown in the header through the stock fields' },
  'StockResponse.name': { reason: 'Shown in the header' },
  'StockResponse.exchange': { reason: 'Shown in the header' },
  'StockResponse.currency': { reason: 'Shown beside the price' },
  'StockResponse.sector': { reason: 'Shown in the header' },
  'StockResponse.industry': missing,
  'StockResponse.instrument_type': { reason: 'Said by the reason an unsupported stock is not analysed' },
  'StockResponse.pipeline_supported': { reason: 'Decides whether the call or the reason is shown' },
  'StockResponse.unsupported_reason': { reason: 'Shown in place of the call for an unsupported stock' },
  'PriceResponse.day': { reason: 'The chart has no axis; it draws the closes in day order' },
  'PriceResponse.close': { reason: 'The line of the 90-day chart' },
  'PriceResponse.open': missing,
  'PriceResponse.high': missing,
  'PriceResponse.low': missing,
  'PriceResponse.volume': missing,
  'PriceResponse.currency': { reason: repeats },
  'PriceResponse.source': missing,
  'PriceResponse.recorded_at': missing,
  'StockFundamentalsResponse.stock_id': { reason: repeats },
  'StockFundamentalsResponse.ticker': { reason: repeats },
  'StockFundamentalsResponse.run_id': { reason: 'Decides whether there are fundamentals at all' },
  'StockFundamentalsResponse.run_day': { reason: 'Shown as "Fundamentals as of"' },
  'StockFundamentalsResponse.data_vintage': missing,
  'StockFundamentalsResponse.valuation': { reason: 'Shown through ValuationFacts' },
  'StockFundamentalsResponse.growth': { reason: 'Shown through GrowthFacts' },
  'StockFundamentalsResponse.profitability': { reason: 'Shown through ProfitabilityFacts' },
  'StockFundamentalsResponse.balance_sheet': { reason: 'Shown through BalanceSheetFacts' },
  'StockFundamentalsResponse.risk': { reason: 'Shown through RiskFacts' },
  'StockFundamentalsResponse.price': { reason: 'Shown through PriceFacts' },
  'StockFundamentalsResponse.dividend': { reason: 'Shown through DividendFacts' },
  'ValuationFacts.peg_ratio': { reason: 'The PEG tile was removed (the figure was not reliable)' },
  'GrowthFacts.revenue_growth_annual': missing,
  'GrowthFacts.revenue_growth_3yr_cagr': missing,
  'ProfitabilityFacts.operating_margin': missing,
  'ProfitabilityFacts.fcf_to_net_income': missing,
  'ProfitabilityFacts.margin_trend': missing,
  'BalanceSheetFacts.current_ratio': missing,
  'BalanceSheetFacts.interest_coverage': missing,
  'BalanceSheetFacts.free_cash_flow': missing,
  'BalanceSheetFacts.cash_position': missing,
  'RiskFacts.annualized_vol_pct': missing,
  'RiskFacts.max_drawdown_1yr_pct': missing,
  'RiskFacts.max_drawdown_3yr_pct': missing,
  'PriceFacts.current_price': { reason: 'The page shows the newest stored close from the snapshot' },
  'PriceFacts.market_cap': { reason: 'Shown under the price, in the stock\'s currency' },
  'PriceFacts.currency': { reason: 'The currency the market cap is written in' },
  'DividendFacts.payout_ratio': missing,
  'AnalysisRunSummary.analysis_id': { reason: 'An id: the link to the analysis' },
  'AnalysisRunSummary.stock_id': { reason: repeats },
  'AnalysisRunSummary.ticker': { reason: repeats },
  'AnalysisRunSummary.name': { reason: repeats },
  'AnalysisRunSummary.status': { reason: 'Only completed analyses are listed', gap: 'S-9' },
  'AnalysisRunSummary.triggered_at': { reason: 'The date shown is when it completed' },
  'AnalysisRunSummary.completed_at': { reason: call },
  'AnalysisRunSummary.duration_s': missing,
  'AnalysisRunSummary.stock_outlook_direction': { reason: call },
  'AnalysisRunSummary.overall_confidence': { reason: call },
  'AnalysisRunSummary.expected_return_tier': { reason: call },
  'AnalysisRunSummary.expected_return_pct': { reason: call },
  'AnalysisRunSummary.disagreement_class': { reason: call },
  'AnalysisRunSummary.pipeline_version': missing,
  'PredictionResponse.prediction_id': { reason: 'An id' },
  'PredictionResponse.analysis_id': { reason: 'The key that joins a prediction to its analysis' },
  'PredictionResponse.stock': { reason: repeats },
  'PredictionResponse.created_at': { reason: 'The analysis date is shown' },
  'PredictionResponse.benchmark_price_at_recommendation': missing,
  'PredictionResponse.predicted_return_tier': { reason: call },
  'PredictionResponse.predicted_return_pct': { reason: call },
  'PredictionResponse.predicted_return_low': { reason: call },
  'PredictionResponse.predicted_return_high': { reason: call },
  'PredictionResponse.stock_outlook_direction': { reason: call },
  'PredictionResponse.overall_confidence': { reason: call },
  'PredictionResponse.checkpoints': { reason: 'Shown through the Prediction and Return columns' },
  'PredictionResponse.shadow': missing,
  'PredictionCheckpointResponse.due_date': missing,
  'PredictionCheckpointResponse.status_reason': missing,
  'PredictionCheckpointResponse.actual_price': missing,
  'PredictionCheckpointResponse.dividends_per_share': missing,
  'PredictionCheckpointResponse.benchmark_price': missing,
  'PredictionCheckpointResponse.benchmark_dividends_per_share': missing,
  'PredictionCheckpointResponse.benchmark_total_return_pct': missing,
  'PredictionCheckpointResponse.excess_return_pct': { reason: 'No "was it right" verdict is served or shown', gap: 'S-8' },
  'PredictionCheckpointResponse.interpolated_expected': missing,
  'PredictionCheckpointResponse.exit_date': missing,
  'PredictionCheckpointResponse.checked_at': missing,
  'PredictionCheckpointResponse.resolver_version': missing,
  'PredictionCheckpointResponse.resolution_detail': missing,
}

export const STOCK_DETAIL_SCREEN: ScreenFieldSet = {
  screen: 'stock-detail',
  schemas: [
    'StockResponse', 'PriceResponse', 'StockFundamentalsResponse', 'ValuationFacts', 'GrowthFacts', 'ProfitabilityFacts', 'BalanceSheetFacts',
    'RiskFacts', 'PriceFacts', 'DividendFacts', 'AnalysisRunSummary', 'PredictionResponse', 'PredictionCheckpointResponse',
  ],
  fields: [...FUNDAMENTAL_FIELDS, ...HISTORY_FIELDS],
  notShown: STOCK_DETAIL_NOT_SHOWN,
  notShownSchemas: {
    ExchangeRateListResponse: { reason: 'An envelope: the newest observation is read (useFxRates)' },
    ExchangeRatePoint: { reason: 'The newest USD/CAD rate converts figures to CAD (also on Dividends); neither it nor its day is drawn' },
    PriceListResponse: { reason: 'An envelope: every page is read (fetchAllPages)' },
    StockSnapshotListResponse: { reason: 'An envelope around the one stock asked for' },
    AnalysisListResponse: { reason: 'An envelope: every page is read' },
    PredictionListResponse: { reason: 'An envelope: every page is read' },
    ShadowPredictionResponse: { reason: 'Not in the original design', gap: 'S-9' },
  },
}
