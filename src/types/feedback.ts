export interface AccuracySummary {
  total_scored_predictions: number
  direction_accuracy: number
  avg_composite_score: number
  alpha_vs_tsx_pct: number
  avg_return_when_correct: number
  avg_return_when_incorrect: number
}

export interface EquityCurvePeriod {
  date: string
  portfolio_value: number
  benchmark_value: number
}

export interface WalkForwardEquityCurve {
  starting_value: number
  current_value: number
  benchmark_current_value: number
  periods: EquityCurvePeriod[]
}

export interface ConfidenceCalibrationBucket {
  confidence_bucket: string
  predictions: number
  accuracy: number
  avg_return: number
}

export interface AgentAccuracyEntry {
  signal_accuracy: number
  contribution_score: number
}

export interface CompetenceBoundaries {
  best_performing_sectors: string[]
  weakest_performing_sectors: string[]
  best_timeline: string
  weakest_timeline: string
}

export interface LearningJournalEntry {
  date: string
  insight: string
}

export interface FeedbackData {
  user_id: string
  as_of: string
  accuracy_summary: AccuracySummary
  walk_forward_equity_curve: WalkForwardEquityCurve
  confidence_calibration: ConfidenceCalibrationBucket[]
  by_agent_accuracy: Record<string, AgentAccuracyEntry>
  competence_boundaries: CompetenceBoundaries
  learning_journal: LearningJournalEntry[]
}
