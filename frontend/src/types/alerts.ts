export type AlertType =
  | 'outlook_change'
  | 'portfolio_optimization'
  | 'prediction_result'
  | 'price_movement'
  | 'earnings_upcoming'
  | 'agent_decision'

export interface Alert {
  alert_id: string
  user_id: string
  type: AlertType
  title: string
  message: string
  ticker: string | null
  action_url: string | null
  action_label: string | null
  is_read: boolean
  created_at: string
  meta: Record<string, unknown>
}
