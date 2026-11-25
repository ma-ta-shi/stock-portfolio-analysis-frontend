import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useUser } from '@/context/UserContext'
import { apiFetch, jsonBody } from '@/lib/api'
import { fetchAllPages } from '@/lib/fetch-all-pages'
import { queryKeys } from '@/lib/query-keys'
import { mapWatchlistEntry, type ApiWatchlistEntry } from '@/lib/watchlist'

const RECORDED = '/mock-data/watchlist/watchlist.json'

/** Every watched stock with its price and call, in one read (the page sorts them itself). */
export function useWatchlist({ enabled = true }: { enabled?: boolean } = {}) {
  const { userId } = useUser()
  const result = useQuery({
    queryKey: queryKeys.watchlist(userId),
    enabled,
    queryFn: ({ signal }) => fetchAllPages<ApiWatchlistEntry>(RECORDED, `/api/watchlist?user_id=${userId}&include=snapshot`, { signal }),
  })
  const data = useMemo(() => result.data?.map(mapWatchlistEntry), [result.data])
  return { ...result, data }
}

/** A watchlist write, then a fresh read: nothing is edited in the cache by hand. Mock mode refuses writes (`apiFetch`). */
function useWatchlistWrite<T>(write: (userId: string, input: T) => Promise<unknown>) {
  const { userId } = useUser()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: T) => write(userId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.watchlist(userId) }),
  })
}

export function useAddToWatchlist() {
  return useWatchlistWrite((userId, ticker: string) => apiFetch(RECORDED, '/api/watchlist', jsonBody('POST', { user_id: userId, ticker })))
}

/** The server archives the entry; adding the stock again brings it back. */
export function useRemoveFromWatchlist() {
  return useWatchlistWrite((_userId, watchlistId: string) => apiFetch(RECORDED, `/api/watchlist/${watchlistId}`, { method: 'DELETE' }))
}
