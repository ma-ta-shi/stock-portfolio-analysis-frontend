// Legacy shape: what PortfolioOptimizerSection and use-portfolio were built on (a model confidence on each suggestion).
// The backend now returns the types in optimizer-api.ts (a stored run with a code-built write-up). Replace these when the
// section is rewired to the real routes; until then they stay so the screen keeps compiling.
export interface SwapSuggestion {
  sell: { ticker: string; account_type: string; rationale: string }
  buy: { ticker: string; account_type: string; rationale: string }
  confidence: number
  expected_return_improvement_pct: number
  risk_change: 'lower' | 'neutral' | 'higher'
}

export interface RebalanceSuggestion {
  ticker: string
  current_weight_pct: number
  target_weight_pct: number
  action: 'increase' | 'decrease'
  amount_cad: number
  confidence: number
  rationale: string
}

export interface PortfolioOptimizerResult {
  user_id: string
  as_of: string
  no_changes_needed: boolean
  swap_suggestions: SwapSuggestion[]
  rebalance_suggestions: RebalanceSuggestion[]
}
