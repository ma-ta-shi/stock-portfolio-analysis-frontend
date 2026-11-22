import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import { useUser } from '@/context/UserContext'
import type { PredictionsResponse } from '@/types'

export function usePredictions() {
  const { userId } = useUser()
  return useQuery({
    queryKey: queryKeys.predictions(userId),
    queryFn: ({ signal }) =>
      apiFetch<PredictionsResponse>(
        `/mock-data/predictions/${userId}.json`,
        `/api/predictions/${userId}`,
        { signal },
      ),
  })
}
