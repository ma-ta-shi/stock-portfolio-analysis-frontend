export type AccountType = 'tfsa' | 'rrsp' | 'trading'
export type Timeline = 'short_term' | 'medium_term' | 'long_term'
export type InvestmentGoalType =
  | 'early_retirement'
  | 'passive_income'
  | 'down_payment'
  | 'education'
  | 'wealth_building'
  | 'emergency_fund'
  | 'other'
export type GoalPriority = 'high' | 'medium' | 'low'
export type DividendPreference = 'high' | 'moderate' | 'minimal' | 'none'
export type GeographicPreference = 'canadian' | 'north_american' | 'global' | 'us_focused'
export type RrspContributionStrategy =
  | 'maximize_each_year'
  | 'maximize_when_possible'
  | 'targeted_deduction'
  | 'system_advised'

export interface Goal {
  name: string
  type: InvestmentGoalType
  target_amount?: number
  target_date?: string
  target_passive_income?: number
  priority: GoalPriority
  notes?: string
}

export interface NotificationSettings {
  recommendation_changes: boolean
  price_alerts: boolean
  prediction_checkpoints: boolean
  market_news: boolean
}

export interface AppSettings {
  llm_mode: string
  batch_analysis_schedule: string
  notifications: NotificationSettings
}

export interface TimeConstraint {
  description: string
  amount_needed: number
  deadline: string
  account_source: string
  priority: string
}

export interface InvestmentPreferences {
  sectors_to_avoid: string[]
  sectors_of_interest: string[]
  max_single_position_pct: number
  dividend_preference: DividendPreference | boolean
  geographic_preference: GeographicPreference | string
  rrsp_contribution_strategy?: RrspContributionStrategy
}

export interface ContextAndGoals {
  primary_goal?: string
  target_retirement_age?: number
  target_portfolio_value?: number
  target_annual_passive_income?: number
  goals?: Goal[]
  time_sensitive_constraints: TimeConstraint[]
  investment_preferences: InvestmentPreferences
  notes_to_agents: string
}

export interface FinancialProfile {
  province: string
  income_bracket: string
  marginal_tax_rate: number
  marginal_tax_rate_is_manual?: boolean
  investment_experience: string
  risk_tolerance: string
  tfsa_contribution_room: number
  rrsp_contribution_room: number
  default_account_type: AccountType
  default_timeline: Timeline
}

export interface User {
  user_id: string
  display_name: string
  is_active: boolean
  created_at: string
}

export interface UserProfile extends User {
  financial_profile: FinancialProfile
  context_and_goals: ContextAndGoals
  app_settings: AppSettings
}
