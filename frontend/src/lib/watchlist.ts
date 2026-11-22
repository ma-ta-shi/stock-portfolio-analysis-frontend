import type { WatchlistItem } from '@/types'
import { parseDate } from './format'

/** True until the backend has completed a first analysis of this stock. */
export function isAwaitingAnalysis(item: Pick<WatchlistItem, 'last_analyzed_at'>): boolean {
  return item.last_analyzed_at == null
}

export type WatchlistSortKey = 'projected_return_pct' | 'confidence_score' | 'day_change_pct' | 'last_analyzed_at'
export type SortDir = 'asc' | 'desc'

function sortValue(item: WatchlistItem, key: WatchlistSortKey): number | null {
  if (key === 'last_analyzed_at') {
    return item.last_analyzed_at == null ? null : parseDate(item.last_analyzed_at).getTime()
  }
  return item[key]
}

/**
 * Sort a copy of the watchlist. Items without a value for the column (not yet priced or
 * analysed) always go last, in either direction, so they never crowd the top of the list.
 */
export function sortWatchlist(items: readonly WatchlistItem[], key: WatchlistSortKey, dir: SortDir): WatchlistItem[] {
  return [...items].sort((a, b) => {
    const va = sortValue(a, key)
    const vb = sortValue(b, key)
    if (va == null && vb == null) return 0
    if (va == null) return 1
    if (vb == null) return -1
    return dir === 'asc' ? va - vb : vb - va
  })
}
