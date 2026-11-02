import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import type { AnalysisRun, AgentResults } from '@/types'

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
