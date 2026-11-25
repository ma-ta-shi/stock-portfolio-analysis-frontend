/**
 * Holdings (and closed positions): every field of the holding and its position, declared once; the stock and its call are taken
 * from the shared fields (`../stock`).
 * `places` says where it shows: `column` in the Holdings table, `detail` in the expanded row, `csv` in the export.
 */
import { defineFields, type NotShown } from '@/lib/fields'
import { formatCAD, formatMoney, formatNumber, formatPct, formatPercent } from '@/lib/format'
import { gainLossColor } from '@/lib/labels'
import { cn } from '@/lib/utils'
import { money, stockField } from '../stock'
import type { ApiFieldKey } from '@/lib/fields'
import type { Holding } from '@/types/portfolio'
import { day, signedPct } from '../formatters'

export const HOLDING_FIELDS = defineFields<Holding>([
  // The stock
  stockField('ticker'),
  stockField('name'),
  stockField('instrument_type'),
  stockField('exchange'),
  stockField('sector'),
  stockField('currency'),
  stockField('unsupported_reason'),

  // The holding
  { id: 'account', label: 'Account', source: 'HoldingResponse.account_type', get: (h) => h.account_type.toUpperCase(), places: ['column', 'csv'] },
  { id: 'is_active', label: 'Position', source: 'HoldingResponse.is_active', get: (h) => h.is_active, format: (v) => (v ? 'Open' : 'Closed'), places: ['detail', 'csv'] },
  { id: 'shares', label: 'Shares', source: 'HoldingResponse.shares', get: (h) => h.shares, places: ['column', 'csv'] },
  { id: 'average_cost', label: 'Avg cost', source: 'HoldingResponse.average_cost_basis', get: (h) => h.average_cost_basis, format: (v, h) => money(h, v), tooltip: "Per share, in the stock's currency", places: ['column', 'csv'] },
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
  stockField('change_day'),
  stockField('change_week'),
  stockField('change_month'),
  { id: 'book_cost', label: 'Book cost', source: 'HoldingResponse.total_book_cost', get: (h) => h.total_book_cost, format: (v, h) => money(h, v), tooltip: "In the stock's currency, for the shares held now", places: ['column', 'detail', 'csv'] },
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

  // The stock's call
  stockField('call'),
  stockField('target_price'),
  stockField('status'),
  stockField('exclusions'),
  stockField('rerun_reasons'),
  stockField('next_earnings'),
  stockField('run_id'),
  stockField('call_as_of'),
  stockField('outlook'),
  stockField('previous_outlook'),
  stockField('outlook_changed'),
  stockField('confidence'),
  stockField('tier'),
  stockField('expected_return'),
  stockField('range_low'),
  stockField('range_high'),
  stockField('disagreement'),
  stockField('income_per_share', { tooltip: "The dividends the analysis expects per share over the next 12 months, in the stock's currency. Your expected dividend income is this times your shares" }),
  { id: 'dividend_yield', label: 'Div yield', source: ['AnalysisCallResponse.income_per_share', 'PositionLineResponse.price'], get: (h) => h.dividend_yield, format: (v) => formatPercent(v as number | null), tooltip: 'Expected income over price', places: ['column', 'csv'] },
  { id: 'yield_on_cost', label: 'YoC', source: ['AnalysisCallResponse.income_per_share', 'HoldingResponse.average_cost_basis'], get: (h) => h.yield_on_cost, format: (v) => formatPercent(v as number | null), tooltip: 'Expected income over your average cost', places: ['column', 'csv'] },
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
  'PositionLineResponse.ticker': { reason: repeats },
  'PositionLineResponse.account': { reason: repeats },
  'PositionLineResponse.currency': { reason: repeats },
  'PositionLineResponse.shares': { reason: repeats },
  'ConfirmationResponse.kind': { reason: 'Confirming positions with the broker has no screen in the original design' },
  'ConfirmationResponse.account_type': { reason: 'Confirming positions with the broker has no screen in the original design' },
  'ConfirmationResponse.what': { reason: 'Confirming positions with the broker has no screen in the original design' },
  'ConfirmationResponse.last_confirmed': { reason: 'Confirming positions with the broker has no screen in the original design' },
  'ConfirmationResponse.age_days': { reason: 'Confirming positions with the broker has no screen in the original design' },
  'ConfirmationResponse.overdue': { reason: 'Confirming positions with the broker has no screen in the original design' },
}
