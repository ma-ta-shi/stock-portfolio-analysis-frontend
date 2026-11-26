import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import type { components } from '@/types/openapi.gen'

/** One analysis result as the API serves it (the Analysis page, and the latest run on the Stock page). */
export function useAnalysisResult(analysisId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.analysis.result(analysisId ?? ''),
    enabled: !!analysisId,
    queryFn: ({ signal }) =>
      apiFetch<components['schemas']['AnalysisResultResponse']>('/mock-data/stocks/result.json', `/api/analysis/${analysisId}`, { signal }),
  })
}
