/**
 * The Watchlist: the columns of the original design and, in the expanded row, what else the API knows. The stock and its call are
 * the shared fields (`../stock`); this file says where each shows here and adds what only a watchlist entry has.
 */
import { CallHeadline, CallWarning } from '@/components/StockCall'
import { Badge } from '@/components/ui/badge'
import { defineFields, type ApiFieldKey, type FieldSpec, type NotShown, type ScreenFieldSet } from '@/lib/fields'
import { formatPct } from '@/lib/format'
import { unavailableLabel, type GapId } from '@/lib/gaps'
import { DISAGREEMENT_CLASS_LABELS, gainLossColor } from '@/lib/labels'
import { cn } from '@/lib/utils'
import { isAwaitingAnalysis } from '@/lib/stock-snapshot'
import type { WatchlistItem } from '@/types/watchlist'
import { day, text } from '../formatters'
import { confidenceCell, dash, stockField } from '../stock'

const column = { places: ['column' as const] }
const detail = { places: ['detail' as const] }

/** A column the original design has and the API cannot fill. */
const unavailable = (id: string, label: string, gap: GapId): FieldSpec<WatchlistItem> => ({
  id,
  label,
  source: [],
  get: () => null,
  format: () => unavailableLabel(gap),
  places: ['column'],
  render: () => <span className="text-xs text-muted-foreground">{unavailableLabel(gap)}</span>,
})

export const WATCHLIST_FIELDS = defineFields<WatchlistItem>([
  stockField('ticker', column),
  stockField('sector', column),
  stockField('price'),
  stockField('change_day', {
    ...column,
    label: 'Day Δ',
    render: (i) => (i.call?.changeDay == null ? dash : <span className={gainLossColor(i.call.changeDay)}>{formatPct(i.call.changeDay)}</span>),
  }),
  stockField('outlook', {
    ...column,
    source: ['AnalysisCallResponse.outlook', 'AnalysisCallResponse.tier', 'StockSnapshotResponse.status', 'StockSnapshotResponse.exclusions'],
    render: (i) =>
      i.stock.pipeline_supported === false ? (
        dash // the Stock cell says it is unsupported
      ) : isAwaitingAnalysis(i) ? (
        <Badge variant="outline" className="border-dashed text-xs font-normal text-muted-foreground">
          Awaiting analysis
        </Badge>
      ) : (
        <span className="inline-flex items-center gap-1 whitespace-nowrap">
          <CallHeadline analysis={i.call?.analysis} />
          {i.call && <CallWarning call={i.call} />}
        </span>
      ),
  }),
  stockField('confidence', { ...column, render: confidenceCell }),
  stockField('disagreement', {
    ...column,
    render: (i) => {
      const found = i.call?.analysis?.disagreementClass
      return found ? <span className={cn(DISAGREEMENT_CLASS_LABELS[found].tone)}>{DISAGREEMENT_CLASS_LABELS[found].label}</span> : dash
    },
  }),
  stockField('expected_return', { ...column, label: 'Proj. Return' }),
  unavailable('portfolio_fit', 'Portfolio Fit', 'W-1'),
  unavailable('suggested_account', 'Account', 'W-2'),
  stockField('call_as_of', { ...column, label: 'Last Analyzed', format: (v) => (v ? day(v) : 'Not yet') }),

  // the expanded row
  stockField('price_day', detail),
  stockField('change_week', detail),
  stockField('change_month', detail),
  stockField('tier', detail),
  stockField('target_price', detail),
  stockField('range_low', detail),
  stockField('range_high', detail),
  stockField('income_per_share', detail),
  stockField('previous_outlook', detail),
  stockField('status', detail),
  stockField('exclusions', detail),
  stockField('rerun_reasons', detail),
  stockField('next_earnings', detail),
  { id: 'notes', label: 'Notes', source: 'WatchlistResponse.notes', get: (i) => i.notes, format: text, places: ['detail'] },
  { id: 'added_at', label: 'Added', source: 'WatchlistResponse.added_at', get: (i) => i.added_at, format: day, places: ['detail'] },

  // what Add Stock sends
  { id: 'new_ticker', label: 'Ticker', source: 'WatchlistCreate.ticker', get: (i) => i.stock.ticker, places: ['input'] },
])

export const WATCHLIST_SORTABLE: ReadonlySet<string> = new Set(['change_day', 'confidence', 'expected_return', 'call_as_of'])

export const WATCHLIST_NOT_SHOWN: Partial<Record<ApiFieldKey, NotShown>> = {
  'WatchlistResponse.watchlist_id': { reason: 'An id: what Remove sends' },
  'WatchlistResponse.user_id': { reason: 'The user the page is already showing' },
  'WatchlistResponse.stock': { reason: "Shown through the stock's own fields (StockSummary)" },
  'WatchlistResponse.snapshot': { reason: "Shown through the snapshot's own fields (StockSnapshotResponse)" },
  'WatchlistResponse.default_timeline': { reason: 'There is one timeline, so there is nothing to show' },
  'WatchlistResponse.is_active': { reason: 'Only watched stocks are listed' },
  'WatchlistCreate.user_id': { reason: 'The current user, filled in by the page' },
  'WatchlistCreate.default_timeline': { reason: 'There is one timeline: not sent' },
  'WatchlistCreate.notes': { reason: 'Not sent: the original Add Stock has no note field', gap: 'W-5' },
}

export const WATCHLIST_SCREEN: ScreenFieldSet = {
  screen: 'watchlist',
  schemas: ['WatchlistResponse', 'WatchlistCreate'],
  fields: WATCHLIST_FIELDS,
  notShown: WATCHLIST_NOT_SHOWN,
  notShownSchemas: {
    WatchlistListResponse: { reason: 'An envelope: every page is read (fetchAllPages) and the rows mapped' },
    WatchlistUpdate: { reason: 'Editing a note is not in the original design', gap: 'W-5' },
  },
}
