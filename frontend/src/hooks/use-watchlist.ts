import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import { useUser } from '@/context/UserContext'
import type { WatchlistItem, WatchlistResponse } from '@/types'
import type { TickerResult } from './use-ticker-search'

export function useWatchlist() {
  const { userId } = useUser()
  return useQuery({
    queryKey: queryKeys.watchlist(userId),
    queryFn: ({ signal }) =>
      apiFetch<WatchlistResponse>(
        `/mock-data/watchlist/${userId}.json`,
        `/api/watchlist/${userId}`,
        { signal },
      ),
  })
}

function withSummary(res: WatchlistResponse, data: WatchlistItem[]): WatchlistResponse {
  return {
    ...res,
    data,
    summary: {
      ...res.summary,
      total: data.length,
      bullish_count: data.filter((i) => i.stock_outlook === 'bullish' || i.stock_outlook === 'somewhat_bullish').length,
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
        return withSummary(old, [...old.data, item])
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
        return withSummary(old, old.data.filter((i) => i.watchlist_id !== watchlistId))
      })
    },
  })
}
