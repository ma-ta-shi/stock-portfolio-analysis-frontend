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
        current_price: stock.current_price ?? 0,
        day_change: 0,
        day_change_pct: 0,
        week_change_pct: 0,
        month_change_pct: 0,
        stock_outlook: 'neutral',
        projected_return_pct: 0,
        portfolio_fit: 'worth_monitoring',
        confidence_score: 0,
        disagreement_score: 0,
        disagreement_label: 'low',
        suggested_account: 'tfsa',
        last_analyzed_at: now,
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
