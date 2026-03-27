import { AccuracyCards } from './feedback/AccuracyCards'
import { EquityCurve } from './feedback/EquityCurve'
import { ConfidenceCalibration } from './feedback/ConfidenceCalibration'
import { AgentAccuracyTable } from './feedback/AgentAccuracyTable'
import { PredictionHistory } from './feedback/PredictionHistory'
import { CompetenceBoundaries } from './feedback/CompetenceBoundaries'

export function FeedbackPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Feedback & Accuracy</h1>
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
