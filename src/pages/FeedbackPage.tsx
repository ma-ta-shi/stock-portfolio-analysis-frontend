import { AccuracyCards } from './feedback/AccuracyCards'
import { EquityCurve } from './feedback/EquityCurve'
import { ConfidenceCalibration } from './feedback/ConfidenceCalibration'
import { AgentAccuracyTable } from './feedback/AgentAccuracyTable'
import { PredictionHistory } from './feedback/PredictionHistory'
import { CompetenceBoundaries } from './feedback/CompetenceBoundaries'
import { QueryError } from '@/components/QueryError'
import { useFeedback } from '@/hooks/use-feedback'

export function FeedbackPage() {
  // The sections below share this query (deduplicated by TanStack Query) and render
  // nothing when it fails, so the error is reported once here.
  const { isError, error, refetch } = useFeedback()

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Feedback & Accuracy</h1>
      {isError && <QueryError what="accuracy data" error={error} onRetry={refetch} className="mb-6" />}
      <AccuracyCards />
      <EquityCurve />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <ConfidenceCalibration />
        <AgentAccuracyTable />
      </div>
      <h2 className="font-semibold mb-3">Prediction History</h2>
      <div className="mb-6">
        <PredictionHistory />
      </div>
      <CompetenceBoundaries />
    </div>
  )
}
