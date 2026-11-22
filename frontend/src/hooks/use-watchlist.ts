import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import { useUser } from '@/context/UserContext'
import type { WatchlistItem, WatchlistResponse } from '@/types'
import type { TickerResult } from './use-ticker-search'

export function useWatchlist({ enabled = true }: { enabled?: boolean } = {}) {
  const { userId } = useUser()
  return useQuery({
    queryKey: queryKeys.watchlist(userId),
    enabled,
    queryFn: ({ signal }) =>
      apiFetch<WatchlistResponse>(
        `/mock-data/watchlist/${userId}.json`,
        `/api/watchlist/${userId}`,
        { signal },
      ),
  })
}

/**
 * Counts as "bullish" in WatchlistSummary.bullish_count. Matches the mock data
 * (user_02: one bullish + one somewhat_bullish → bullish_count 2).
 */
const BULLISH = new Set<WatchlistItem['stock_outlook']>(['bullish', 'somewhat_bullish'])

/**
 * Adjust the server's summary for a local add/remove instead of recomputing it, so the
 * backend's own counts stay authoritative and are only nudged by the change we made.
 */
function adjustSummary(
  res: WatchlistResponse,
  data: WatchlistItem[],
  change: { added?: WatchlistItem; removed?: WatchlistItem },
): WatchlistResponse {
  const bullishDelta =
    (change.added && BULLISH.has(change.added.stock_outlook) ? 1 : 0) -
    (change.removed && BULLISH.has(change.removed.stock_outlook) ? 1 : 0)
  return {
    ...res,
    data,
    summary: {
      ...res.summary,
      total: Math.max(0, res.summary.total + (change.added ? 1 : 0) - (change.removed ? 1 : 0)),
      bullish_count: Math.max(0, res.summary.bullish_count + bullishDelta),
    },
  }
}

/** Mock mode: updates the cache only (no API call), like the portfolio mutations. */
export function useAddToWatchlist() {
  const { userId } = useUser()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (stock: TickerResult): Promise<WatchlistItem> => {
      const now = new Date().toISOString()
      return {
        watchlist_id: `wl_${Date.now()}`,
        user_id: userId,
        stock: {
          stock_id: stock.stock_id,
          ticker: stock.ticker,
          name: stock.name,
          sector: stock.sector,
          exchange: stock.exchange,
          currency: stock.currency,
        },
        // Not priced or analysed yet — null, never placeholder values that look real.
        current_price: stock.current_price ?? null,
        day_change: null,
        day_change_pct: null,
        week_change_pct: null,
        month_change_pct: null,
        stock_outlook: null,
        projected_return_pct: null,
        portfolio_fit: null,
        confidence_score: null,
        disagreement_score: null,
        disagreement_label: null,
        suggested_account: null,
        last_analyzed_at: null,
        added_at: now,
      }
    },
    onSuccess: (item) => {
      queryClient.setQueryData<WatchlistResponse>(queryKeys.watchlist(userId), (old) => {
        if (!old) return old
        if (old.data.some((i) => i.stock.stock_id === item.stock.stock_id)) return old
        return adjustSummary(old, [...old.data, item], { added: item })
      })
    },
  })
}

/** Mock mode: updates the cache only (no API call). */
export function useRemoveFromWatchlist() {
  const { userId } = useUser()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (watchlistId: string) => watchlistId,
    onSuccess: (watchlistId) => {
      queryClient.setQueryData<WatchlistResponse>(queryKeys.watchlist(userId), (old) => {
        if (!old) return old
        const removed = old.data.find((i) => i.watchlist_id === watchlistId)
        if (!removed) return old
        return adjustSummary(old, old.data.filter((i) => i.watchlist_id !== watchlistId), { removed })
      })
    },
  })
}
