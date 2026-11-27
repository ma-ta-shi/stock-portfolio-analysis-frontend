/** The Feedback page's pipeline-wide reads, shared by all users: the newest scorecard and this week's batch. */
import { useQuery } from '@tanstack/react-query'
import { ApiError, apiFetch } from '@/lib/api'
import { mapScorecard, type Scorecard } from '@/lib/feedback'
import { queryKeys } from '@/lib/query-keys'
import type { components } from '@/types/openapi.gen'

type Api = components['schemas']
const DIR = '/mock-data/feedback'

/** `null` when no scorecard has been saved yet, which is an answer rather than a failure. */
export function useScorecard() {
  return useQuery({
    queryKey: queryKeys.feedback.scorecard,
    queryFn: async ({ signal }): Promise<Scorecard | null> => {
      const section = (name: 'overview' | 'scoring') =>
        apiFetch<Api['ScorecardResponse']>(`${DIR}/scorecard-${name}.json`, `/api/scorecard?section=${name}`, { signal })
      try {
        const [overview, scoring, versions] = await Promise.all([
          section('overview'),
          section('scoring'),
          apiFetch<Api['PipelineVersionListResponse']>(`${DIR}/pipeline-versions.json`, '/api/pipeline-versions?per_page=100', { signal }),
        ])
        return mapScorecard(overview, scoring, versions)
      } catch (error) {
        if (error instanceof ApiError && error.code === 'SCORECARD_NOT_FOUND') return null
        throw error
      }
    },
  })
}

export function useWeeklyBatch() {
  return useQuery({
    queryKey: queryKeys.feedback.batch,
    queryFn: ({ signal }) => apiFetch<Api['WeeklyBatchResponse']>(`${DIR}/weekly-batch.json`, '/api/weekly-batch', { signal }),
  })
}
