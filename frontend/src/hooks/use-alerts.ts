import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import { useUser } from '@/context/UserContext'
import type { Alert } from '@/types'

interface AlertsResponse {
  data: Alert[]
}

interface UnreadCountResponse {
  user_id: string
  unread_count: number
}

export function useAlerts() {
  const { userId } = useUser()
  return useQuery({
    queryKey: queryKeys.alerts.list(userId),
    queryFn: ({ signal }) =>
      apiFetch<AlertsResponse>(
        `/mock-data/alerts/${userId}.json`,
        `/api/alerts/${userId}`,
        { signal },
      ),
    select: (res) => res.data,
  })
}

export function useUnreadCount() {
  const { userId } = useUser()
  return useQuery({
    queryKey: queryKeys.alerts.unreadCount(userId),
    queryFn: ({ signal }) =>
      apiFetch<UnreadCountResponse>(
        `/mock-data/alerts/${userId}/unread_count.json`,
        `/api/alerts/${userId}/unread-count`,
        { signal },
      ),
    select: (res) => res.unread_count,
  })
}
