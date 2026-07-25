import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import type { AnalysisSummary, AnalysisRun, AgentResults } from '@/types'

interface RecentAnalysesResponse {
  data: AnalysisSummary[]
}

export function useRecentAnalyses() {
  return useQuery({
    queryKey: ['analysis', 'recent'],
    queryFn: () =>
      apiFetch<RecentAnalysesResponse>(
        '/mock-data/analysis/recent.json',
        '/api/analysis/recent',
      ),
    select: (res) => res.data,
  })
}

export function useAnalysisRun(analysisId: string) {
  return useQuery({
    queryKey: ['analysis', 'run', analysisId],
    queryFn: () =>
      apiFetch<AnalysisRun>(
        `/mock-data/analysis/${analysisId}.json`,
        `/api/analysis/${analysisId}`,
      ),
    enabled: !!analysisId,
  })
}

export function useAgentResults(analysisId: string) {
  return useQuery({
    queryKey: ['analysis', 'agents', analysisId],
    queryFn: () =>
      apiFetch<AgentResults>(
        `/mock-data/analysis/${analysisId}/agents.json`,
        `/api/analysis/${analysisId}/agents`,
      ),
    enabled: !!analysisId,
  })
}
