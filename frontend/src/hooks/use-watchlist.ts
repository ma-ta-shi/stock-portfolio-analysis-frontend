import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { useUser } from '@/context/UserContext'
import type { WatchlistResponse } from '@/types'

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
