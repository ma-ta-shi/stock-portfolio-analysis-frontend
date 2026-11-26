/**
 * The stock snapshot (`StockSnapshotResponse` + `AnalysisCallResponse`): a stock's latest price and changes and the call its
 * newest analysis made, in the form every screen that lists stocks shows it (Portfolio holdings, Watchlist, Stock page).
 * One mapper here, one set of fields (`screens/stock`), so a screen never reads the raw response itself.
 *
 * Ratios (changes, expected return) become fractions through `asFraction`; a stock with no usable call is a normal state
 * (`status: 'excluded'` with reasons, or `analysis: null`), never an error.
 */
import { localDateInputValue, parseDate } from './format'
import { asFraction } from './units'
import type { components } from '@/types/openapi.gen'
import type { Stock } from '@/types/stock'

type Api = components['schemas']
export type ApiStockSnapshot = Api['StockSnapshotResponse']
export type ApiAnalysisCall = Api['AnalysisCallResponse']

export type Outlook = NonNullable<ApiAnalysisCall['outlook']>
export type ReturnTier = NonNullable<ApiAnalysisCall['tier']>
export type DisagreementClass = NonNullable<ApiAnalysisCall['disagreement_class']>

export interface AnalysisCall {
  runId: string
  /** The day of the analysis (a date, no time). */
  asOf: string | null
  outlook: Outlook | null
  confidence: number | null
  tier: ReturnTier | null
  /** Over the band's horizon, in the quote currency; a fraction. */
  expectedReturn: number | null
  targetPrice: number | null
  rangeLow: number | null
  rangeHigh: number | null
  /** Expected dividends per share over the band's horizon, in the quote currency. */
  incomePerShare: number | null
  disagreementClass: DisagreementClass | null
  previousOutlook: Outlook | null
  outlookChanged: boolean | null
}

export interface StockSnapshot {
  stockId: string
  ticker: string
  currency: string
  /** The newest recorded close, in the quote currency. */
  price: number | null
  priceDay: string | null
  /** Fractions: 0.0678 is 6.78%. */
  changeDay: number | null
  changeWeek: number | null
  changeMonth: number | null
  status: ApiStockSnapshot['status']
  /** Why the call cannot be used: `stale`, `earnings_since`, `trigger_crossed`, `unsupported_instrument`, ... */
  exclusions: string[]
  /** The part of `exclusions` a new analysis would fix. */
  rerunReasons: string[]
  nextEarningsDate: string | null
  analysis: AnalysisCall | null
}

export function mapAnalysisCall(call: ApiAnalysisCall): AnalysisCall {
  return {
    runId: call.run_id,
    asOf: call.as_of ?? null,
    outlook: call.outlook ?? null,
    confidence: call.confidence ?? null,
    tier: call.tier ?? null,
    expectedReturn: asFraction('AnalysisCallResponse.expected_return', call.expected_return),
    targetPrice: call.target_price ?? null,
    rangeLow: call.range_low ?? null,
    rangeHigh: call.range_high ?? null,
    incomePerShare: call.income_per_share ?? null,
    disagreementClass: call.disagreement_class ?? null,
    previousOutlook: call.previous_outlook ?? null,
    outlookChanged: call.outlook_changed ?? null,
  }
}

export function mapStockSnapshot(snapshot: ApiStockSnapshot): StockSnapshot {
  return {
    stockId: snapshot.stock_id,
    ticker: snapshot.ticker,
    currency: snapshot.currency,
    price: snapshot.price ?? null,
    priceDay: snapshot.price_day ?? null,
    changeDay: asFraction('StockSnapshotResponse.change_day', snapshot.change_day),
    changeWeek: asFraction('StockSnapshotResponse.change_week', snapshot.change_week),
    changeMonth: asFraction('StockSnapshotResponse.change_month', snapshot.change_month),
    status: snapshot.status,
    exclusions: snapshot.exclusions,
    rerunReasons: snapshot.rerun_reasons,
    nextEarningsDate: snapshot.next_earnings_date ?? null,
    analysis: snapshot.analysis ? mapAnalysisCall(snapshot.analysis) : null,
  }
}

/** Whole days between an analysis day and `now`; null when there is no day. */
export function callAgeDays(asOf: string | null, now: number = Date.now()): number | null {
  if (!asOf) return null
  const day = new Date(`${asOf}T00:00:00`).getTime()
  return Number.isNaN(day) ? null : Math.max(0, Math.floor((now - day) / 86_400_000))
}

/** A stock as every screen lists it (`StockSummary`). `sector` is the one class label the whole API uses, or null when not mapped. */
export function mapStock(stock: components['schemas']['StockSummary']): Stock {
  return {
    stock_id: stock.stock_id,
    ticker: stock.ticker,
    name: stock.name,
    sector: stock.sector ?? null,
    exchange: stock.exchange,
    currency: stock.currency as Stock['currency'],
    pipeline_supported: stock.pipeline_supported,
    instrument_type: stock.instrument_type ?? null,
    unsupported_reason: stock.unsupported_reason ?? null,
  }
}

/** No completed analysis (a stock the pipeline cannot analyse never gets one; screens say why instead). */
export const isAwaitingAnalysis = (row: { call: StockSnapshot | null }) => row.call?.analysis == null

/**
 * A past run from the history list, in the shape every call is drawn from. A past run has no usability status (so no warning is
 * drawn) and the list serves no target price; its range is a return, not a price, so the price range stays empty.
 */
export function mapRunCall(run: Api['AnalysisRunSummary'], currency: string): StockSnapshot {
  return {
    stockId: run.stock_id,
    ticker: run.ticker,
    currency,
    price: null,
    priceDay: null,
    changeDay: null,
    changeWeek: null,
    changeMonth: null,
    status: 'usable',
    exclusions: [],
    rerunReasons: [],
    nextEarningsDate: null,
    analysis: {
      runId: run.analysis_id,
      asOf: localDateInputValue(parseDate(run.completed_at ?? run.triggered_at)), // the instant's day here, not in UTC
      outlook: run.stock_outlook_direction ?? null,
      confidence: run.overall_confidence ?? null,
      tier: run.expected_return_tier ?? null,
      expectedReturn: asFraction('AnalysisRunSummary.expected_return_pct', run.expected_return_pct),
      targetPrice: null,
      rangeLow: null,
      rangeHigh: null,
      incomePerShare: null,
      disagreementClass: run.disagreement_class ?? null,
      previousOutlook: null,
      outlookChanged: null,
    },
  }
}
