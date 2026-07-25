import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { useUser } from '@/context/UserContext'
import type { FeedbackData } from '@/types'

export function useFeedback() {
  const { userId } = useUser()
  return useQuery({
    queryKey: ['feedback', userId],
    queryFn: () =>
      apiFetch<FeedbackData>(
        `/mock-data/feedback/${userId}.json`,
        `/api/feedback/${userId}`,
      ),
  })
}
