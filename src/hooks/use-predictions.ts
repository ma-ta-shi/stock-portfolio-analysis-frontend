import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import type { components } from '@/types/openapi.gen'

export const PREDICTIONS_PER_PAGE = 20

/** The predictions of the weekly batch runs of the current design, newest first. Shared by all users. */
export function usePredictions(page: number) {
  return useQuery({
    queryKey: queryKeys.feedback.predictions(page),
    placeholderData: keepPreviousData,
    queryFn: ({ signal }) =>
      apiFetch<components['schemas']['PredictionListResponse']>(
        `/api/predictions?current_design=true&page=${page}&per_page=${PREDICTIONS_PER_PAGE}`,
        { signal },
      ),
  })
}
