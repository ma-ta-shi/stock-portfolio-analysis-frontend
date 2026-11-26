/**
 * The stock, its price and changes, and the call of its newest analysis (`StockSummary`, `StockSnapshotResponse`,
 * `AnalysisCallResponse`), declared once for every screen that lists stocks. A row only needs `{ stock, call }`. A screen takes a
 * field with `stockField(id)` and says where it shows or how it is drawn there; the default places are the Holdings ones.
 */
import { Badge } from '@/components/ui/badge'
import { StockCall } from '@/components/StockCall'
import { defineFields, type ApiFieldKey, type FieldSpec, type NotShown, type ScreenFieldSet } from '@/lib/fields'
import { formatMoney, formatNumber } from '@/lib/format'
import { DISAGREEMENT_CLASS_LABELS, OUTLOOK_LABELS, TIER_LABELS, TONE_TEXT, exclusionLabel } from '@/lib/labels'
import type { StockSnapshot } from '@/lib/stock-snapshot'
import { cn } from '@/lib/utils'
import type { Stock } from '@/types/stock'
import { day, signedPct } from '../formatters'

export interface StockRow {
  stock: Stock
  call: StockSnapshot | null
}

/** A figure in the row's own stock currency. */
export const money = (h: Pick<StockRow, 'stock'>, value: unknown) => formatMoney(value as number | null, h.stock.currency)
const list = (value: unknown) => ((value as string[]).length ? (value as string[]).map(exclusionLabel).join('; ') : '—')

export const STOCK_ROW_FIELDS = defineFields<StockRow>([
  {
    id: 'ticker',
    label: 'Stock',
    source: ['StockSummary.ticker', 'StockSummary.name', 'StockSummary.pipeline_supported', 'StockSummary.unsupported_reason'],
    get: (h) => h.stock.ticker,
    places: ['column', 'csv'],
    render: (h) => (
      <>
        <div className="font-medium">{h.stock.ticker}</div>
        <div className="max-w-36 whitespace-normal text-xs leading-tight text-muted-foreground">{h.stock.name}</div>
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
  // The newest recorded close (Holdings values a position at its own price instead).
  {
    id: 'price',
    label: 'Price',
    source: 'StockSnapshotResponse.price',
    get: (h) => h.call?.price,
    format: (v, h) => (v == null ? '—' : `${formatNumber(v as number)} ${h.stock.currency}`),
    places: ['column'],
    render: (h) =>
      h.call?.price == null ? (
        <span className="text-muted-foreground">—</span>
      ) : (
        <>
          {formatNumber(h.call.price)} <span className="text-xs text-muted-foreground">{h.stock.currency}</span>
        </>
      ),
  },
  { id: 'price_day', label: 'Price day', source: 'StockSnapshotResponse.price_day', get: (h) => h.call?.priceDay, format: day, places: ['detail'] },
  { id: 'change_day', label: 'Change (day)', source: 'StockSnapshotResponse.change_day', get: (h) => h.call?.changeDay, format: (v) => signedPct(v), places: ['detail', 'csv'] },
  { id: 'change_week', label: 'Change (week)', source: 'StockSnapshotResponse.change_week', get: (h) => h.call?.changeWeek, format: (v) => signedPct(v), places: ['detail', 'csv'] },
  { id: 'change_month', label: 'Change (month)', source: 'StockSnapshotResponse.change_month', get: (h) => h.call?.changeMonth, format: (v) => signedPct(v), places: ['detail', 'csv'] },
  {
    id: 'call',
    label: 'Call',
    source: ['StockSnapshotResponse.analysis', 'StockSnapshotResponse.status', 'StockSnapshotResponse.exclusions', 'StockSnapshotResponse.rerun_reasons'],
    get: (h) => h.call?.analysis?.outlook ?? null,
    format: (v) => (v ? OUTLOOK_LABELS[v as keyof typeof OUTLOOK_LABELS] : 'No call'),
    places: ['column', 'csv'],
    render: (h) => <StockCall call={h.call} supported={h.stock.pipeline_supported !== false} />,
  },
  {
    id: 'target_price',
    label: 'Target price (12 months)',
    source: ['AnalysisCallResponse.target_price', 'AnalysisCallResponse.expected_return'],
    get: (h) => h.call?.analysis?.targetPrice,
    format: (v, h) => (v == null ? '—' : `${money(h, v)} (${signedPct(h.call?.analysis?.expectedReturn)})`),
    tooltip: "The analysis's 12-month target price, and its expected total return (price change plus dividends)",
    places: ['column', 'detail', 'csv'],
    render: (h) =>
      h.call?.analysis?.targetPrice == null ? (
        <span className="text-muted-foreground">—</span>
      ) : (
        <>
          <div>{money(h, h.call.analysis.targetPrice)}</div>
          <div className="text-xs text-muted-foreground">{signedPct(h.call.analysis.expectedReturn)}</div>
        </>
      ),
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
  { id: 'range_low', label: 'Range low (10th percentile)', source: 'AnalysisCallResponse.range_low', get: (h) => h.call?.analysis?.rangeLow, format: (v, h) => money(h, v), places: ['detail', 'csv'] },
  { id: 'range_high', label: 'Range high (90th percentile)', source: 'AnalysisCallResponse.range_high', get: (h) => h.call?.analysis?.rangeHigh, format: (v, h) => money(h, v), places: ['detail', 'csv'] },
  { id: 'disagreement', label: 'Disagreement', source: 'AnalysisCallResponse.disagreement_class', get: (h) => h.call?.analysis?.disagreementClass, format: (v) => (v ? DISAGREEMENT_CLASS_LABELS[v as keyof typeof DISAGREEMENT_CLASS_LABELS].label : '—'), places: ['detail', 'csv'] },
  { id: 'income_per_share', label: 'Expected dividends / share', source: 'AnalysisCallResponse.income_per_share', get: (h) => h.call?.analysis?.incomePerShare, format: (v, h) => money(h, v), tooltip: "The dividends the analysis expects per share over the next 12 months, in the stock's currency.", places: ['detail', 'csv'] },
])

/** One shared field, with what this screen changes about it (places, label, tooltip, cell). */
export function stockField(id: string, overrides: Partial<FieldSpec<StockRow>> = {}): FieldSpec<StockRow> {
  const spec = STOCK_ROW_FIELDS.find((s) => s.id === id)
  if (!spec) throw new Error(`No stock field "${id}"`)
  return { ...spec, ...overrides }
}

const repeats = 'Repeats the stock the row is for'

export const STOCK_NOT_SHOWN: Partial<Record<ApiFieldKey, NotShown>> = {
  'StockSummary.stock_id': { reason: 'An id: the link to the stock page' },
  'StockSnapshotResponse.stock_id': { reason: repeats },
  'StockSnapshotResponse.ticker': { reason: repeats },
  'StockSnapshotResponse.currency': { reason: repeats },
}

export const STOCK_SCREEN: ScreenFieldSet = {
  screen: 'stock',
  schemas: ['StockSummary', 'StockSnapshotResponse', 'AnalysisCallResponse'],
  fields: STOCK_ROW_FIELDS,
  notShown: STOCK_NOT_SHOWN,
}
