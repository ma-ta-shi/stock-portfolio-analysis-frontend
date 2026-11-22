import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import { useUser } from '@/context/UserContext'
import type { FeedbackData } from '@/types'

export function useFeedback() {
  const { userId } = useUser()
  return useQuery({
    queryKey: queryKeys.feedback(userId),
    queryFn: ({ signal }) =>
      apiFetch<FeedbackData>(
        `/mock-data/feedback/${userId}.json`,
        `/api/feedback/${userId}`,
        { signal },
      ),
  })
}
