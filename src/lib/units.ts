/**
 * Units of the backend's percentage-like numbers.
 *
 * The API mixes two scales: some fields are whole percents (`unrealised_pct: 9.11` means 9.11%), others are fractions
 * (`expected_total_return: 0.0678` means 6.78%), and a few are percentage points. The backend declares each field's unit once
 * (`backend/src/data/reference/units.py`), states it in the field's description ("Whole percent: 9.11 means 9.11%.") and marks
 * it `x-unit` in the OpenAPI; `npm run gen:api` turns the markers into `src/types/units.gen.ts`, which this file imports.
 * Nothing here is kept by hand. The app's formatters (`formatPct`, `formatPercent`) take fractions, so a whole percent passed
 * straight in would print 911%.
 *
 * Rule: convert once, at the boundary. A hook's view-model mapper reads every ratio-like field through
 * `asFraction('Schema.field', value)`, so components only ever see fractions and keep `formatPct`. The key is checked by the
 * compiler: a field that is not a `'percent'` or `'fraction'` in the generated table cannot be passed. A name cannot be
 * trusted (the optimizer's matrix, predicted lines and target book carry fractions under names without `_pct`, and
 * `tax_rate_pct` / `noise_margin_pts` beside them are points), which is why the unit comes from the backend, not the name.
 *
 * The table is also checked against the generated API types at compile time: every field NAMED `_pct` must be in it, and a
 * key that is not a field of the API is an error.
 */
import type { components } from '@/types/openapi.gen'
import { UNIT_BY_FIELD } from '@/types/units.gen'

export type Unit = 'percent' | 'fraction' | 'points'

type Schemas = components['schemas']
/** Every `Schema.field` of the generated API types. */
type FieldKey = { [S in keyof Schemas & string]: `${S}.${keyof Schemas[S] & string}` }[keyof Schemas & string]
/** The fields named `_pct`: all of them must be in `UNITS`. */
type PctFieldKey = Extract<FieldKey, `${string}_pct`>


export const UNITS = UNIT_BY_FIELD satisfies Record<PctFieldKey, Unit> & Partial<Record<FieldKey, Unit>>

/** The keys whose value is a ratio the app can show as a percent: a whole percent or a fraction. */
export type RatioKey = {
  [K in keyof typeof UNITS]: (typeof UNITS)[K] extends 'percent' | 'fraction' ? K : never
}[keyof typeof UNITS]

/**
 * A ratio-like API field as a fraction (0.0911 = 9.11%), ready for `formatPct`. The key names the field and decides the
 * conversion; a key that is not classified as `'percent'` or `'fraction'` does not compile. Null and undefined pass through.
 */
export function asFraction(key: RatioKey, value: number | null | undefined): number | null {
  if (value == null) return null
  return UNITS[key] === 'percent' ? value / 100 : value
}
