/** Home's own reads: what changed for the user, and the market figures of the newest analysis. */
import { useQuery } from '@tanstack/react-query'
import { useUser } from '@/context/UserContext'
import { apiFetch } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import type { components } from '@/types/openapi.gen'

type Api = components['schemas']

/** The last 7 days' events and everything still waiting on the user, in the server's order. */
export function useActivity() {
  const { userId } = useUser()
  return useQuery({
    queryKey: queryKeys.activity(userId),
    // read afresh on every visit: what was just confirmed or run elsewhere in the app must not linger here
    staleTime: 0,
    queryFn: ({ signal }) =>
      apiFetch<Api['ActivityListResponse']>(`/api/activity?user_id=${encodeURIComponent(userId)}&per_page=100`, { signal }),
  })
}

/** Rates and VIX as the newest analysis saw them; the same for every user. */
export function useMacro() {
  return useQuery({
    queryKey: queryKeys.market.macro,
    queryFn: ({ signal }) => apiFetch<Api['MacroSnapshotResponse']>('/api/macro', { signal }),
  })
}
