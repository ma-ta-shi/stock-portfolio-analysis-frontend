/**
 * Units of the backend's percentage-like numbers.
 *
 * The API mixes two scales: some fields are whole percents (`unrealised_pct: 9.11` means 9.11%), others are fractions
 * (`expected_total_return: 0.0678` means 6.78%). The app's formatters (`formatPct`, `formatPercent`) take fractions,
 * so a whole percent passed straight in would print 911%.
 *
 * Rule: convert once, at the boundary. A hook's view-model mapper reads every ratio-like field through
 * `asFraction('Schema.field', value)`, so components only ever see fractions and keep `formatPct`. The key is checked
 * by the compiler: a field that is not in `UNITS` as `'percent'` or `'fraction'` cannot be passed, so the first screen
 * that uses a field has to classify it here, after checking it on a running backend (quote the value) or in the code
 * that computes it. That is the guard for every field, whatever its name: the optimizer's account matrix, predicted
 * lines and target book carry fractions under names without `_pct`, and `tax_rate_pct` / `noise_margin_pts` beside them
 * are points, so a name cannot be trusted. A field missing from this table is not known to be anything.
 *
 * `units.test.ts` adds a second net: it fails when the generated API schema gains a field NAMED `_pct` that is not
 * classified here.
 *
 * Entries below were checked 2026-11-22 on a running backend (the value is quoted) or in the code that computes them.
 */
export type Unit = 'percent' | 'fraction' | 'points' | 'unverified'

/** A whole percent (9.11 = 9.11%) as a fraction (0.0911). Null and undefined pass through. */
export function fromPercent(value: number | null | undefined): number | null {
  return value == null ? null : value / 100
}

export const UNITS = {
  // Typed schema fields ending in `_pct`. All whole percents.
  'PositionLineResponse.unrealised_pct': 'percent', // 9.11 for 878.8 gain on 9643.2 cost
  'PositionLineResponse.weight_pct': 'percent', // 13.62
  'RaiseOptionResponse.weight_pct': 'percent', // 27.38
  'AnalysisRunSummary.expected_return_pct': 'percent', // 6.78, equals the band's expected_total_return_pct
  'PredictionResponse.predicted_return_pct': 'percent', // 6.99
  'PredictionCheckpointResponse.actual_total_return_pct': 'percent', // code: stock_total * 100
  'PredictionCheckpointResponse.benchmark_total_return_pct': 'percent', // code: market_total * 100
  'PredictionCheckpointResponse.excess_return_pct': 'percent', // code: (stock - market) * 100
  'TransactionResponse.realized_gain_loss_pct': 'percent', // code: gain / cost removed * 100
  'DividendEventResponse.withholding_rate_pct': 'percent', // code: "the percent withheld at source" (0 for a Canadian listing)
  'MatrixCellResponse.tax_rate_pct': 'percent', // 6.39
  'PredictedLinesResponse.tax_rate_pct': 'percent',
  'PortfolioAccountResponse.conversion_cost_pct': 'percent', // 1.5
  'PortfolioAccountUpdate.conversion_cost_pct': 'percent',
  'BenchmarkLineResponse.return_pct': 'percent', // 6.54
  'BenchmarkLineResponse.break_even_conversion_pct': 'percent', // 1.11
  'UserProfileResponse.max_position_size_pct': 'percent', // 10
  'UserProfileCreate.max_position_size_pct': 'percent',
  'UserProfileUpdate.max_position_size_pct': 'percent',
  'UserProfileResponse.max_sector_weight_pct': 'percent', // 30
  'UserProfileCreate.max_sector_weight_pct': 'percent',
  'UserProfileUpdate.max_sector_weight_pct': 'percent',
  'BaselineOutcomeResponse.total_return_pct': 'percent', // code: (close / close - 1) * 100; no rows stored yet
  'BaselineOutcomeResponse.market_return_pct': 'percent',
  'BaselineOutcomeResponse.required_pct': 'percent',
  'BaselineOutcomeResponse.flat_pct': 'percent',
  'BaselineOutcomeResponse.rf_2y_pct': 'percent', // code: rf_pct / 100 is the fraction, so rf_pct is a percent
  // Null in every stored profile and nowhere computed on, so the scale is not confirmed (the name says percent).
  'UserProfileResponse.marginal_tax_rate_override_pct': 'unverified',
  'UserProfileCreate.marginal_tax_rate_override_pct': 'unverified',
  'UserProfileUpdate.marginal_tax_rate_override_pct': 'unverified',

  // Fractions without a `_pct` suffix (not scanned by the test; listed because they sit beside percent fields).
  'InstrumentViewResponse.expected_total_return': 'fraction', // 0.0678
  'InstrumentViewResponse.market_reference': 'fraction', // 0.0757
  'InstrumentViewResponse.valuation_edge': 'fraction', // -0.0167
  'InstrumentViewResponse.sigma': 'fraction', // 0.189
  'InstrumentViewResponse.view_points': 'points', // 1.06, percentage points
  'InstrumentViewResponse.view_noise_points': 'points', // 1.16
  'PerformanceResponse.return_period': 'fraction', // reports: -0.0493
  'ExposureResponse.cash': 'fraction', // 0.0588 of total value
  'ExposureNameResponse.total': 'fraction', // 0.136 for RY.TO

  // Fields inside untyped dicts (the schema scan cannot see these). `price_band` in the analysis result:
  'price_band.expected_total_return_pct': 'percent', // 6.78
  'price_band.stock_baseline_pct': 'percent', // 5.72
  'price_band.market_reference_pct': 'percent', // 7.57
  'price_band.vs_current_pct.low': 'percent', // -20.63
  'price_band.vs_current_pct.median': 'percent',
  'price_band.vs_current_pct.high': 'percent',
  'price_band.vs_current_pct.target_price': 'percent', // 4.03
  'price_band.view_pts': 'points', // 1.06
} as const satisfies Record<string, Unit>

/** The keys whose value is a ratio the app can show as a percent: a whole percent or a fraction. */
export type RatioKey = {
  [K in keyof typeof UNITS]: (typeof UNITS)[K] extends 'percent' | 'fraction' ? K : never
}[keyof typeof UNITS]

/**
 * A ratio-like API field as a fraction (0.0911 = 9.11%), ready for `formatPct`. The key names the field and decides the
 * conversion; a key that is not classified as `'percent'` or `'fraction'` does not compile. Null and undefined pass through.
 */
export function asFraction(key: RatioKey, value: number | null | undefined): number | null {
  return UNITS[key] === 'percent' ? fromPercent(value) : (value ?? null)
}
