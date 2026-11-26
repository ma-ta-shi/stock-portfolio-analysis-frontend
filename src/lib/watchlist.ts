/** The watchlist rows: the API entry as the view-model, and the counts the page header shows. */
import { isAwaitingAnalysis, mapStock, mapStockSnapshot } from './stock-snapshot'
import type { components } from '@/types/openapi.gen'
import type { WatchlistItem } from '@/types/watchlist'

export type ApiWatchlistEntry = components['schemas']['WatchlistResponse']

export function mapWatchlistEntry(entry: ApiWatchlistEntry): WatchlistItem {
  return {
    watchlist_id: entry.watchlist_id,
    stock: mapStock(entry.stock),
    call: entry.snapshot ? mapStockSnapshot(entry.snapshot) : null,
    notes: entry.notes ?? null,
    added_at: entry.added_at,
  }
}

export function watchlistCounts(items: readonly WatchlistItem[]) {
  const outlook = (i: WatchlistItem) => i.call?.analysis?.outlook
  return {
    total: items.length,
    bullish: items.filter((i) => outlook(i) === 'bullish' || outlook(i) === 'somewhat_bullish').length,
    awaiting: items.filter((i) => i.stock.pipeline_supported !== false && isAwaitingAnalysis(i)).length,
    /** Against the analysis before, not against the owner's last visit. */
    changed: items.filter((i) => i.call?.analysis?.outlookChanged).length,
  }
}
