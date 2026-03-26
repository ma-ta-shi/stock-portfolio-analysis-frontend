import type { AnalysisSummary } from '@/types'

export function getLatestAnalysisIdForTicker(
  ticker: string,
  analyses: AnalysisSummary[] | undefined,
): string | null {
  if (!analyses?.length) {
    return null
  }

  const match = analyses
    .filter((analysis) => analysis.ticker === ticker)
    .sort((a, b) => {
      const aDate = a.completed_at ?? a.triggered_at ?? ''
      const bDate = b.completed_at ?? b.triggered_at ?? ''
      return new Date(bDate).getTime() - new Date(aDate).getTime()
    })[0]

  return match?.analysis_id ?? null
}
