import type { Stock } from './stock'
import type { StockFundamentals, Layer2PortfolioContext } from './analysis'
import type { StockOutlookDirection } from './watchlist'
import type { PaginationMeta } from './api'

export interface StockDetail extends Stock {
  industry?: string
  current_price: number
  day_change: number
  day_change_pct: number
  week_52_high: number
  week_52_low: number
  market_cap_cad: number
  volume?: number
  avg_volume_30d?: number
  fundamentals?: StockFundamentals
  description?: string
  headquarters?: string
  employees?: number
  website?: string
  price_history_90d?: number[]
  latest_analysis?: {
    analysis_id: string
    // Account used for the "latest analysis" snapshot (drives account-specific notes).
    account_type?: string
    stock_outlook: StockOutlookDirection
    confidence_score: number
    disagreement_score: number
    analyzed_at: string
    executive_summary?: string
    key_drivers?: string[]
    layer2_context?: Omit<Layer2PortfolioContext, 'holding_snapshot'>
  }
}

export interface StockAnalysisHistoryEntry {
  analysis_id: string
  stock_outlook: StockOutlookDirection
  confidence_score: number
  disagreement_score: number
  price_at_analysis: number
  account_type: string
  timeline: string
  analyzed_at: string
  prediction_status: 'pending' | 'scored' | 'expired'
  prediction_id?: string
  composite_score?: number
  direction_correct?: boolean
  return_at_1m?: number
  return_at_3m?: number
  benchmark_return_at_1m?: number
  benchmark_return_at_3m?: number
}

export interface StockAnalysisHistory {
  stock_id: string
  ticker: string
  data: StockAnalysisHistoryEntry[]
  meta: PaginationMeta
}
