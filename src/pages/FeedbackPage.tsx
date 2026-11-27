import { QueryError } from '@/components/QueryError'
import { useScorecard } from '@/hooks/use-feedback'
import { AccuracyCards } from './feedback/AccuracyCards'
import { AgentAccuracyTable } from './feedback/AgentAccuracyTable'
import { ConfidenceCalibration } from './feedback/ConfidenceCalibration'
import { EquityCurve } from './feedback/EquityCurve'
import { PredictionHistory } from './feedback/PredictionHistory'
import { ProgressStrip } from './feedback/ProgressStrip'

export function FeedbackPage() {
  // The strip, the cards and the chart share the scorecard query, so its failure is reported once here.
  const { isError, error, refetch } = useScorecard()

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Feedback & Accuracy</h1>
      {isError && <QueryError what="the scorecard" error={error} onRetry={refetch} className="mb-6" />}
      <ProgressStrip />
      <AccuracyCards />
      <EquityCurve />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <ConfidenceCalibration />
        <AgentAccuracyTable />
      </div>
      <h2 className="font-semibold mb-1">Prediction History</h2>
      <p className="text-xs text-muted-foreground mb-3">Weekly batch runs of the current design.</p>
      <PredictionHistory />
    </div>
  )
}
