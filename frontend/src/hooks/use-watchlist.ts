import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { useUser } from '@/context/UserContext'
import type { WatchlistResponse, WatchlistItem } from '@/types'
import type { TickerResult } from './use-ticker-search'

export function useWatchlist() {
  const { userId } = useUser()
  return useQuery({
    queryKey: ['watchlist', userId],
    queryFn: () =>
      apiFetch<WatchlistResponse>(
        `/mock-data/watchlist/${userId}.json`,
        `/api/watchlist/${userId}`,
      ),
  })
}

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
        current_price: 0,
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
        suggested_account: 'any',
        last_analyzed_at: now,
        added_at: now,
      }
    },
    onSuccess: (newItem) => {
      queryClient.setQueryData<WatchlistResponse>(['watchlist', userId], (old) => {
        if (!old) return old
        return {
          ...old,
          data: [...old.data, newItem],
          summary: { ...old.summary, total: old.summary.total + 1 },
        }
      })
    },
  })
}

export function useRemoveFromWatchlist() {
  const { userId } = useUser()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (watchlistId: string) => watchlistId,
    onSuccess: (watchlistId) => {
      queryClient.setQueryData<WatchlistResponse>(['watchlist', userId], (old) => {
        if (!old) return old
        const data = old.data.filter((item) => item.watchlist_id !== watchlistId)
        return { ...old, data, summary: { ...old.summary, total: data.length } }
      })
    },
  })
}
