import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { useUser } from '@/context/UserContext'
import type { PredictionsResponse } from '@/types'

export function usePredictions() {
  const { userId } = useUser()
  return useQuery({
    queryKey: ['predictions', userId],
    queryFn: () =>
      apiFetch<PredictionsResponse>(
        `/mock-data/predictions/${userId}.json`,
        `/api/predictions/${userId}`,
      ),
  })
}
