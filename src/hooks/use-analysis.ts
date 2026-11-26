import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import type { AnalysisRun, AgentResults } from '@/types'
import type { components } from '@/types/openapi.gen'

/** One analysis result as the API serves it. The two hooks below read the retired shapes until the Analysis page is wired. */
export function useAnalysisResult(analysisId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.analysis.result(analysisId ?? ''),
    enabled: !!analysisId,
    queryFn: ({ signal }) =>
      apiFetch<components['schemas']['AnalysisResultResponse']>('/mock-data/stocks/result.json', `/api/analysis/${analysisId}`, { signal }),
  })
}

export function useAnalysisRun(analysisId: string) {
  return useQuery({
    queryKey: queryKeys.analysis.run(analysisId),
    queryFn: ({ signal }) =>
      apiFetch<AnalysisRun>(
        `/mock-data/analysis/${analysisId}.json`,
        `/api/analysis/${analysisId}`,
        { signal },
      ),
    enabled: !!analysisId,
  })
}

export function useAgentResults(analysisId: string) {
  return useQuery({
    queryKey: queryKeys.analysis.agents(analysisId),
    queryFn: ({ signal }) =>
      apiFetch<AgentResults>(
        `/mock-data/analysis/${analysisId}/agents.json`,
        `/api/analysis/${analysisId}/agents`,
        { signal },
      ),
    enabled: !!analysisId,
  })
}
