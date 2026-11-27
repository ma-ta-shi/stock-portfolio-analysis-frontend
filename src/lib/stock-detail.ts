/** The Stock page's reads as view-models: the fundamentals in the shape `StockInfoSection` draws, the history rows, the drivers. */
import { mapCheckpoints, type ApiPrediction, type Checkpoint } from './predictions'
import { mapRunCall, type StockSnapshot } from './stock-snapshot'
import { asFraction } from './units'
import type { components } from '@/types/openapi.gen'
import type { StockFundamentals } from '@/types/analysis'
import type { Stock } from '@/types/stock'

type Api = components['schemas']
export type ApiFundamentals = Api['StockFundamentalsResponse']
export type ApiRunSummary = Api['AnalysisRunSummary']
export type { ApiPrediction }

const some = (value: number | null | undefined) => value ?? undefined

/** The newest stored fundamentals, or undefined when no analysis kept them. */
export function mapFundamentals(f: ApiFundamentals): StockFundamentals | undefined {
  if (!f.run_id) return undefined
  return {
    pe_ratio: some(f.valuation?.pe_ratio),
    forward_pe: some(f.valuation?.forward_pe),
    ev_ebitda: some(f.valuation?.ev_ebitda),
    price_to_book: some(f.valuation?.pb_ratio),
    price_to_sales: some(f.valuation?.ps_ratio),
    revenue_growth_yoy: some(asFraction('GrowthFacts.revenue_growth_yoy', f.growth?.revenue_growth_yoy)),
    earnings_growth_yoy: some(asFraction('GrowthFacts.eps_growth_yoy', f.growth?.eps_growth_yoy)),
    gross_margin: some(asFraction('ProfitabilityFacts.gross_margin', f.profitability?.gross_margin)),
    net_margin: some(asFraction('ProfitabilityFacts.net_margin', f.profitability?.net_margin)),
    roe: some(asFraction('ProfitabilityFacts.roe', f.profitability?.roe)),
    debt_to_equity: some(f.balance_sheet?.debt_to_equity),
    beta: some(f.risk?.beta),
    week_52_high: some(f.price?.high_52w),
    week_52_low: some(f.price?.low_52w),
    dividend_yield_trailing: some(asFraction('DividendFacts.dividend_yield', f.dividend?.dividend_yield)),
  }
}

export interface Driver {
  factor: string
  direction: string | null
}

/** `key_drivers` is untyped in the API: keep what has a factor in words. */
export function mapDrivers(raw: unknown): Driver[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((d) => {
    if (typeof d === 'string') return [{ factor: d, direction: null }]
    const { factor, direction } = (d ?? {}) as { factor?: unknown; direction?: unknown }
    return typeof factor === 'string' ? [{ factor, direction: typeof direction === 'string' ? direction : null }] : []
  })
}

/** One past analysis of the stock and its prediction. `stock` and `call` are what every list of stocks has. */
export interface HistoryRow {
  analysis_id: string
  stock: Stock
  call: StockSnapshot
  timeline: string
  returnLow: number | null
  returnHigh: number | null
  priceAtAnalysis: number | null
  checkpoints: Checkpoint[]
}

export function mapHistory(stock: Stock, runs: readonly ApiRunSummary[], predictions: readonly ApiPrediction[]): HistoryRow[] {
  const byRun = new Map(predictions.map((p) => [p.analysis_id, p]))
  return runs.map((run) => {
    const prediction = byRun.get(run.analysis_id)
    return {
      analysis_id: run.analysis_id,
      stock,
      call: mapRunCall(run, stock.currency),
      timeline: run.timeline,
      returnLow: asFraction('AnalysisRunSummary.expected_return_low', run.expected_return_low),
      returnHigh: asFraction('AnalysisRunSummary.expected_return_high', run.expected_return_high),
      priceAtAnalysis: prediction?.price_at_recommendation ?? null,
      checkpoints: mapCheckpoints(prediction),
    }
  })
}

/** The page's return column: the 3 month result, else the 1 month one (the original rule). */
export function historyReturn(row: HistoryRow): number | null {
  const at = (interval: string) => row.checkpoints.find((c) => c.interval === interval && c.resolved)?.totalReturn ?? null
  return at('3m') ?? at('1m')
}
