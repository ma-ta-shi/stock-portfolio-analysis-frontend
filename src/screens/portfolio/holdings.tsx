/**
 * Holdings (and closed positions): every field of the holding, its position, its stock and the stock's call, declared once.
 * `places` says where it shows: `column` in the Holdings table, `detail` in the expanded row, `csv` in the export.
 */
import { Badge } from '@/components/ui/badge'
import { StockCall } from '@/components/StockCall'
import { defineFields, type NotShown } from '@/lib/fields'
import { formatCAD, formatMoney, formatNumber, formatPct, formatPercent } from '@/lib/format'
import { OUTLOOK_LABELS, TIER_LABELS, DISAGREEMENT_CLASS_LABELS, TONE_TEXT, exclusionLabel, gainLossColor } from '@/lib/labels'
import { cn } from '@/lib/utils'
import type { ApiFieldKey } from '@/lib/fields'
import type { Holding } from '@/types/portfolio'
import { day, signedPct } from '../formatters'

const money = (h: Holding, value: unknown) => formatMoney(value as number | null, h.stock.currency)
const list = (value: unknown) => ((value as string[]).length ? (value as string[]).map(exclusionLabel).join('; ') : '—')

export const HOLDING_FIELDS = defineFields<Holding>([
  // The stock
  {
    id: 'ticker',
    label: 'Stock',
    source: ['StockSummary.ticker', 'StockSummary.name', 'StockSummary.pipeline_supported', 'StockSummary.unsupported_reason'],
    get: (h) => h.stock.ticker,
    places: ['column', 'csv'],
    render: (h) => (
      <>
        <div className="font-medium">{h.stock.ticker}</div>
        <div className="text-xs text-muted-foreground">{h.stock.name}</div>
        {h.stock.pipeline_supported === false && (
          <Badge variant="outline" className={cn('mt-1 border-amber-500 text-xs', TONE_TEXT.warning)} title={h.stock.unsupported_reason ?? undefined}>
            Unsupported
          </Badge>
        )}
      </>
    ),
  },
  { id: 'name', label: 'Company', source: 'StockSummary.name', get: (h) => h.stock.name, places: ['detail', 'csv'] },
  { id: 'instrument_type', label: 'Instrument', source: 'StockSummary.instrument_type', get: (h) => h.stock.instrument_type, places: ['detail', 'csv'] },
  { id: 'exchange', label: 'Exchange', source: 'StockSummary.exchange', get: (h) => h.stock.exchange, places: ['detail', 'csv'] },
  { id: 'sector', label: 'Sector', source: 'StockSummary.sector', get: (h) => h.stock.sector, places: ['detail', 'csv'] },
  { id: 'currency', label: 'Currency', source: 'StockSummary.currency', get: (h) => h.stock.currency, places: ['detail', 'csv'] },
  { id: 'unsupported_reason', label: 'Why not analysed', source: 'StockSummary.unsupported_reason', get: (h) => h.stock.unsupported_reason, places: ['detail', 'csv'] },

  // The holding
  { id: 'account', label: 'Account', source: 'HoldingResponse.account_type', get: (h) => h.account_type.toUpperCase(), places: ['column', 'csv'] },
  { id: 'is_active', label: 'Position', source: 'HoldingResponse.is_active', get: (h) => h.is_active, format: (v) => (v ? 'Open' : 'Closed'), places: ['detail', 'csv'] },
  { id: 'shares', label: 'Shares', source: 'HoldingResponse.shares', get: (h) => h.shares, places: ['column', 'csv'] },
  { id: 'average_cost', label: 'Avg cost', source: 'HoldingResponse.average_cost_basis', get: (h) => h.average_cost_basis, format: (v, h) => money(h, v), tooltip: "Per share, in the stock's currency", places: ['column', 'csv'] },
  { id: 'book_cost', label: 'Book cost', source: 'HoldingResponse.total_book_cost', get: (h) => h.total_book_cost, format: (v, h) => money(h, v), tooltip: "In the stock's currency, for the shares held now", places: ['detail', 'csv'] },
  { id: 'book_cost_cad', label: 'Book cost (CAD)', source: 'HoldingResponse.total_book_cost_cad', get: (h) => h.total_book_cost_cad, format: (v) => formatCAD(v as number | null), places: ['detail', 'csv'] },
  { id: 'total_shares_bought', label: 'Shares bought', source: 'HoldingResponse.total_shares_bought', get: (h) => h.total_shares_bought, tooltip: 'Bought on the market (buys and reinvestments), kept after the position closes', places: ['detail', 'csv'] },
  { id: 'total_shares_sold', label: 'Shares sold', source: 'HoldingResponse.total_shares_sold', get: (h) => h.total_shares_sold, tooltip: 'Sold on the market, kept after the position closes', places: ['detail', 'csv'] },
  { id: 'average_buy_price', label: 'Avg buy price', source: 'HoldingResponse.average_buy_price', get: (h) => h.average_buy_price, format: (v, h) => money(h, v), tooltip: 'Fees left out', places: ['detail', 'csv'] },
  { id: 'average_sell_price', label: 'Avg sell price', source: 'HoldingResponse.average_sell_price', get: (h) => h.average_sell_price, format: (v, h) => money(h, v), tooltip: 'Fees left out', places: ['detail', 'csv'] },
  { id: 'realised', label: 'Realised gain/loss', source: 'HoldingResponse.total_realized_gain_loss', get: (h) => h.total_realized_gain_loss, format: (v, h) => formatMoney(v as number, h.stock.currency, { signed: true }), tooltip: "The API does not state this figure's currency; shown in the stock's currency (gap P-C1)", places: ['detail', 'csv'] },
  { id: 'dividends_received', label: 'Dividends received', source: 'HoldingResponse.total_dividends_received', get: (h) => h.total_dividends_received, format: (v, h) => money(h, v), places: ['detail', 'csv'] },
  { id: 'fees_paid', label: 'Fees paid', source: 'HoldingResponse.total_fees_paid', get: (h) => h.total_fees_paid, format: (v, h) => money(h, v), places: ['detail', 'csv'] },
  { id: 'first_buy', label: 'First buy', source: 'HoldingResponse.first_buy_date', get: (h) => h.first_buy_date, format: day, places: ['detail', 'csv'] },
  { id: 'last_activity', label: 'Last activity', source: 'HoldingResponse.last_transaction_date', get: (h) => h.last_transaction_date, format: day, tooltip: 'The last entry of any kind, not necessarily the last sale', places: ['detail', 'csv'] },
  { id: 'notes', label: 'Notes', source: 'HoldingResponse.notes', get: (h) => h.notes, places: ['detail', 'csv'] },

  // Price, changes and the position (valued by the backend, in Canadian dollars)
  {
    id: 'price',
    label: 'Price',
    source: ['PositionLineResponse.price', 'StockSnapshotResponse.price', 'StockSnapshotResponse.change_day'],
    get: (h) => h.current_price,
    format: (v) => (v == null ? 'No price' : formatNumber(v as number)),
    places: ['column', 'csv'],
    render: (h) => (
      <>
        {h.current_price == null ? (
          <span className="text-muted-foreground">No price</span>
        ) : (
          <>
            {formatNumber(h.current_price)} <span className="text-xs text-muted-foreground">{h.stock.currency}</span>
          </>
        )}
        {h.change_day != null && <div className={cn('text-xs', gainLossColor(h.change_day))}>{formatPct(h.change_day)}</div>}
      </>
    ),
  },
  { id: 'price_day', label: 'Price day', source: ['PositionLineResponse.price_day', 'StockSnapshotResponse.price_day'], get: (h) => h.price_day, format: day, places: ['detail', 'csv'] },
  { id: 'price_source', label: 'Price source', source: 'PositionLineResponse.price_source', get: (h) => h.price_source, places: ['detail', 'csv'] },
  { id: 'change_day', label: 'Change (day)', source: 'StockSnapshotResponse.change_day', get: (h) => h.change_day, format: (v) => signedPct(v), places: ['detail', 'csv'] },
  { id: 'change_week', label: 'Change (week)', source: 'StockSnapshotResponse.change_week', get: (h) => h.change_week, format: (v) => signedPct(v), places: ['detail', 'csv'] },
  { id: 'change_month', label: 'Change (month)', source: 'StockSnapshotResponse.change_month', get: (h) => h.change_month, format: (v) => signedPct(v), places: ['detail', 'csv'] },
  {
    id: 'market_value',
    label: 'Market value',
    source: ['HoldingResponse.shares', 'PositionLineResponse.price', 'PositionLineResponse.value_cad'],
    get: (h) => h.market_value,
    format: (v, h) => money(h, v),
    tooltip: "Shares times price, in the stock's currency; the Canadian-dollar value is the backend's",
    places: ['column', 'csv'],
    render: (h) => (
      <>
        <div className="font-medium">{formatMoney(h.market_value, h.stock.currency)}</div>
        {h.stock.currency !== 'CAD' && h.value_cad != null && <div className="text-xs text-muted-foreground">{formatCAD(h.value_cad)}</div>}
      </>
    ),
  },
  { id: 'value_cad', label: 'Value (CAD)', source: 'PositionLineResponse.value_cad', get: (h) => h.value_cad, format: (v) => formatCAD(v as number | null), places: ['detail', 'csv'] },
  { id: 'cost_cad', label: 'Cost base (CAD)', source: 'PositionLineResponse.cost_cad', get: (h) => h.cost_cad, format: (v) => formatCAD(v as number | null), tooltip: 'The tax cost base', places: ['detail', 'csv'] },
  {
    id: 'gain',
    label: 'Gain / loss',
    source: ['PositionLineResponse.unrealised_cad', 'PositionLineResponse.unrealised_pct'],
    get: (h) => h.unrealised_cad,
    format: (v) => formatCAD(v as number | null, { signed: true }),
    tooltip: 'Canadian dollars, including the effect of the exchange rate',
    places: ['column', 'csv'],
    render: (h) => (
      <>
        <div className={cn('text-sm font-medium', gainLossColor(h.unrealised_cad ?? 0))}>{formatCAD(h.unrealised_cad, { signed: true })}</div>
        <div className={cn('text-xs', gainLossColor(h.unrealised_pct ?? 0))}>{formatPct(h.unrealised_pct)}</div>
      </>
    ),
  },
  { id: 'unrealised_pct', label: 'Gain / loss %', source: 'PositionLineResponse.unrealised_pct', get: (h) => h.unrealised_pct, format: (v) => signedPct(v), places: ['csv'] },
  { id: 'unrealised_fx', label: 'Of which currency', source: 'PositionLineResponse.unrealised_fx_cad', get: (h) => h.unrealised_fx_cad, format: (v) => formatCAD(v as number | null, { signed: true }), tooltip: 'The part of the gain that is the exchange rate moving', places: ['detail', 'csv'] },
  { id: 'weight', label: 'Weight', source: 'PositionLineResponse.weight_pct', get: (h) => h.weight, format: (v) => formatPercent(v as number | null, 1), tooltip: 'Share of the portfolio', places: ['detail', 'csv'] },

  // The stock's call (shared with Watchlist and the Stock page through <StockCall>)
  {
    id: 'call',
    label: 'Call',
    source: ['StockSnapshotResponse.analysis', 'StockSnapshotResponse.status', 'StockSnapshotResponse.exclusions', 'StockSnapshotResponse.rerun_reasons'],
    get: (h) => h.call?.analysis?.outlook ?? null,
    format: (v) => (v ? OUTLOOK_LABELS[v as keyof typeof OUTLOOK_LABELS] : 'No call'),
    places: ['column', 'csv'],
    render: (h) => <StockCall call={h.call} supported={h.stock.pipeline_supported !== false} />,
  },
  { id: 'status', label: 'Call usable', source: 'StockSnapshotResponse.status', get: (h) => h.call?.status, format: (v) => (v === 'usable' ? 'Usable' : v === 'excluded' ? 'Excluded' : '—'), places: ['detail', 'csv'] },
  { id: 'exclusions', label: 'Why not usable', source: 'StockSnapshotResponse.exclusions', get: (h) => h.call?.exclusions ?? [], format: list, places: ['detail', 'csv'] },
  { id: 'rerun_reasons', label: 'A new analysis would fix', source: 'StockSnapshotResponse.rerun_reasons', get: (h) => h.call?.rerunReasons ?? [], format: list, places: ['detail', 'csv'] },
  { id: 'next_earnings', label: 'Next earnings', source: 'StockSnapshotResponse.next_earnings_date', get: (h) => h.call?.nextEarningsDate, format: day, places: ['detail', 'csv'] },
  { id: 'run_id', label: 'Analysis', source: 'AnalysisCallResponse.run_id', get: (h) => h.call?.analysis?.runId, tooltip: 'The analysis this call comes from (opens on the analysis page)', places: ['csv'] },
  { id: 'call_as_of', label: 'Analysed', source: 'AnalysisCallResponse.as_of', get: (h) => h.call?.analysis?.asOf, format: day, places: ['detail', 'csv'] },
  { id: 'outlook', label: 'Outlook', source: 'AnalysisCallResponse.outlook', get: (h) => h.call?.analysis?.outlook, format: (v) => (v ? OUTLOOK_LABELS[v as keyof typeof OUTLOOK_LABELS] : '—'), places: ['detail', 'csv'] },
  { id: 'previous_outlook', label: 'Previous outlook', source: 'AnalysisCallResponse.previous_outlook', get: (h) => h.call?.analysis?.previousOutlook, format: (v) => (v ? OUTLOOK_LABELS[v as keyof typeof OUTLOOK_LABELS] : '—'), places: ['detail', 'csv'] },
  { id: 'outlook_changed', label: 'Outlook changed', source: 'AnalysisCallResponse.outlook_changed', get: (h) => h.call?.analysis?.outlookChanged, places: ['detail', 'csv'] },
  { id: 'confidence', label: 'Confidence', source: 'AnalysisCallResponse.confidence', get: (h) => h.call?.analysis?.confidence, format: (v) => (v == null ? '—' : `${v as number}%`), places: ['detail', 'csv'] },
  { id: 'tier', label: 'Tier', source: 'AnalysisCallResponse.tier', get: (h) => h.call?.analysis?.tier, format: (v) => (v ? TIER_LABELS[v as keyof typeof TIER_LABELS] : '—'), tooltip: "Against the stock's own valuation baseline, not the market", places: ['detail', 'csv'] },
  { id: 'expected_return', label: 'Expected return', source: 'AnalysisCallResponse.expected_return', get: (h) => h.call?.analysis?.expectedReturn, format: (v) => signedPct(v), tooltip: "Over the band's horizon, in the stock's currency", places: ['detail', 'csv'] },
  { id: 'target_price', label: 'Target price', source: 'AnalysisCallResponse.target_price', get: (h) => h.call?.analysis?.targetPrice, format: (v, h) => money(h, v), places: ['detail', 'csv'] },
  { id: 'range_low', label: 'Range low (10th signedPct)', source: 'AnalysisCallResponse.range_low', get: (h) => h.call?.analysis?.rangeLow, format: (v, h) => money(h, v), places: ['detail', 'csv'] },
  { id: 'range_high', label: 'Range high (90th signedPct)', source: 'AnalysisCallResponse.range_high', get: (h) => h.call?.analysis?.rangeHigh, format: (v, h) => money(h, v), places: ['detail', 'csv'] },
  { id: 'disagreement', label: 'Disagreement', source: 'AnalysisCallResponse.disagreement_class', get: (h) => h.call?.analysis?.disagreementClass, format: (v) => (v ? DISAGREEMENT_CLASS_LABELS[v as keyof typeof DISAGREEMENT_CLASS_LABELS].label : '—'), places: ['detail', 'csv'] },
  { id: 'income_per_share', label: 'Expected income / share', source: 'AnalysisCallResponse.income_per_share', get: (h) => h.expected_income_per_share, format: (v, h) => money(h, v), tooltip: "Dividends the analysis expects over its horizon, in the stock's currency", places: ['detail', 'csv'] },
  { id: 'dividend_yield', label: 'Div yield', source: ['AnalysisCallResponse.income_per_share', 'PositionLineResponse.price'], get: (h) => h.dividend_yield, format: (v) => formatPercent(v as number | null), tooltip: 'Expected income over price', places: ['column', 'csv'] },
  { id: 'yield_on_cost', label: 'YoC', source: ['AnalysisCallResponse.income_per_share', 'HoldingResponse.average_cost_basis'], get: (h) => h.yield_on_cost, format: (v) => formatPercent(v as number | null), tooltip: 'Expected income over your average cost', places: ['column', 'csv'] },

  // Confirmed with the broker
  {
    id: 'confirmation',
    label: 'Confirmed',
    source: ['ConfirmationResponse.last_confirmed', 'ConfirmationResponse.age_days', 'ConfirmationResponse.overdue'],
    get: (h) => h.confirmation,
    format: (v) => {
      const c = v as Holding['confirmation']
      if (!c) return '—'
      return `${c.lastConfirmed ? `${c.ageDays} days ago` : 'never'}${c.overdue ? ' (overdue)' : ''}`
    },
    tooltip: 'When this position was last checked against the broker; overdue after 45 days',
    places: ['column', 'detail', 'csv'],
  },
])

const repeats = 'Repeats the holding'

/** What the Holdings view does not show, and why. A property listed here is decided, not forgotten. */
export const HOLDING_NOT_SHOWN: Partial<Record<ApiFieldKey, NotShown>> = {
  'HoldingResponse.holding_id': { reason: 'An id: the link for the position history, not a figure' },
  'HoldingResponse.portfolio_id': { reason: 'An id of the portfolio the page is already in' },
  'HoldingResponse.stock': { reason: "Shown through the stock's own fields (StockSummary)" },
  'HoldingResponse.snapshot': { reason: "Shown through the snapshot's own fields (StockSnapshotResponse)" },
  'HoldingResponse.position': { reason: "Shown through the position's own fields (PositionLineResponse)" },
  'HoldingResponse.added_at': { reason: 'Record bookkeeping: when the row was created' },
  'HoldingResponse.last_updated': { reason: 'Record bookkeeping: when the row last changed' },
  'StockSummary.stock_id': { reason: 'An id: the link to the stock page' },
  'StockSnapshotResponse.stock_id': { reason: repeats },
  'StockSnapshotResponse.ticker': { reason: repeats },
  'StockSnapshotResponse.currency': { reason: repeats },
  'PositionLineResponse.ticker': { reason: repeats },
  'PositionLineResponse.account': { reason: repeats },
  'PositionLineResponse.currency': { reason: repeats },
  'PositionLineResponse.shares': { reason: repeats },
  'ConfirmationResponse.kind': { reason: 'Matches the confirmation to a position or to an account cash balance' },
  'ConfirmationResponse.account_type': { reason: 'Matches the confirmation to its account' },
  'ConfirmationResponse.what': { reason: 'Matches the confirmation to its ticker' },
}
