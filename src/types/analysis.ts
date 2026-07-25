import type { Recommendation, DisagreementLabel, StockOutlookDirection, PortfolioFit } from './watchlist'
import type { Stock } from './stock'

export type AnalysisStatus = 'pending' | 'running' | 'complete' | 'failed'
export type SignalDirection = 'bullish' | 'neutral' | 'bearish'
export type AgentName =
  | 'fundamental_analyst'
  | 'technical_analyst'
  | 'sentiment_analyst'
  | 'macro_economist'
  | 'stock_researcher'
  | 'bull_advocate'
  | 'bear_advocate'
  | 'risk_advisor'
  | 'tax_strategist'
  | 'cio'

export interface StockOutlook {
  direction: StockOutlookDirection
  thesis_summary: string
  key_drivers: string[]
}

export interface HoldingSnapshot {
  shares: number
  average_cost: number
  book_cost: number
  current_value: number
  total_return_cad: number
  total_return_pct: number
  day_change_cad: number
  dividend_income_ytd?: number
  yield_on_cost?: number
  by_account?: { account_type: string; shares: number; value: number; avg_cost: number }[]
}

export interface Layer2PortfolioContext {
  is_in_portfolio: boolean
  portfolio_fit: PortfolioFit
  portfolio_fit_rationale: string
  suggested_action: string
  suggested_amount_cad?: number
  would_replace?: string
  // Rendered in the "Portfolio Context" layer and filled from per-user holdings.
  // Placeholders supported: {{shares}}, {{account_type}}.
  account_note_template?: string
  holding_snapshot?: HoldingSnapshot
}

export interface StockFundamentals {
  pe_ratio?: number
  forward_pe?: number
  ev_ebitda?: number
  price_to_book?: number
  price_to_sales?: number
  peg_ratio?: number
  revenue_growth_yoy?: number
  earnings_growth_yoy?: number
  gross_margin?: number
  net_margin?: number
  roe?: number
  debt_to_equity?: number
  beta?: number
  week_52_high?: number
  week_52_low?: number
  dividend_yield_trailing?: number
  business_description?: string
}

export interface DataBundleSummary {
  price_at_analysis: number
  market_cap_cad?: number
  volume_vs_avg?: number
  data_quality: string
  data_sources?: string[]
}

export interface FinalRecommendation {
  stock_outlook: StockOutlook
  confidence_score: number
  disagreement_score: number
  disagreement_label: DisagreementLabel
  executive_summary: string
  cio_rationale?: string
}

export interface AnalysisSummary {
  analysis_id: string
  ticker: string
  name?: string
  account_type: string
  timeline?: string
  status: AnalysisStatus
  stock_outlook: StockOutlookDirection
  confidence_score: number
  disagreement_score: number
  disagreement_label?: DisagreementLabel
  triggered_at?: string
  completed_at: string | null
  duration_seconds?: number | null
}

export interface AnalysisRun {
  analysis_id: string
  user_id?: string
  stock: Stock
  account_type: string
  timeline: string
  status: AnalysisStatus
  final_recommendation: FinalRecommendation
  data_bundle_summary: DataBundleSummary
  stock_fundamentals?: StockFundamentals
  layer2_context?: Layer2PortfolioContext
  triggered_at: string
  completed_at: string
  duration_seconds: number
  trace_id: string
}

export interface Pass1AgentResult {
  agent: AgentName
  pass_number: 1
  signal: SignalDirection
  key_findings: string[]
  overall_signal_direction: SignalDirection
  data_quality: string
  critical_risks: string[]
  completed_at: string
  duration_seconds: number
}

export interface Pass2AgentResult {
  agent: AgentName
  pass_number: 2
  recommendation: Recommendation
  confidence_score: number
  key_arguments: string[]
  completed_at: string
  duration_seconds: number
}

export interface CioResult {
  agent: 'cio'
  pass_number: number | null
  stock_outlook: StockOutlook
  confidence_score: number
  disagreement_score: number
  disagreement_label: DisagreementLabel
  executive_summary: string
  key_disagreements_addressed: string
  account_specific_note: string
  completed_at: string
  duration_seconds: number
}

export interface AgentResults {
  analysis_id: string
  pass_1: Record<string, Pass1AgentResult>
  disagreement_score_pass_1?: number
  pass_2: Record<string, Pass2AgentResult>
  disagreement_score_pass_2?: number
  cio: CioResult
}
