import type { Recommendation } from './watchlist'
import type { PaginationMeta } from './api'

export interface PredictionCheckpoint {
  interval: string
  due_at: string
  status: 'pending' | 'scored'
  score: number | null
  price_at_checkpoint?: number
  return_pct?: number
  benchmark_return_pct?: number
  direction_correct?: boolean
}

export interface Prediction {
  prediction_id: string
  user_id: string
  analysis_id: string
  ticker: string
  recommendation: Recommendation
  confidence_score: number
  price_at_recommendation: number
  recommended_at: string
  account_type: string
  timeline: string
  checkpoints: PredictionCheckpoint[]
  composite_score: number | null
  status: 'active' | 'complete'
}

export interface PredictionsSummary {
  total_predictions: number
  active: number
  scored: number
  direction_accuracy: number
  avg_composite_score: number
  alpha_generated_pct: number
}

export interface PredictionsResponse {
  data: Prediction[]
  summary: PredictionsSummary
  meta: PaginationMeta
}
