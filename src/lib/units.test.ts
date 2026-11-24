import { describe, expect, it } from 'vitest'
import { asFraction } from './units'

// The table is generated from the backend's `x-unit` markers and checked against the generated API types by the compiler (see
// `units.ts`): a `_pct` field with no unit, or a key that is not an API field, fails `tsc`. These tests cover the conversion itself.

describe('asFraction', () => {
  it('divides a whole percent and leaves a fraction alone', () => {
    expect(asFraction('PositionLineResponse.unrealised_pct', 9.11)).toBeCloseTo(0.0911)
    expect(asFraction('InstrumentViewResponse.expected_total_return', 0.0678)).toBe(0.0678)
    expect(asFraction('PriceVsCurrent.low', -20.63)).toBeCloseTo(-0.2063)
  })

  it('passes null and undefined through for both scales', () => {
    expect(asFraction('PositionLineResponse.unrealised_pct', null)).toBeNull()
    expect(asFraction('InstrumentViewResponse.valuation_edge', undefined)).toBeNull()
  })

  it('does not compile for a field that is points or has no unit', () => {
    // @ts-expect-error percentage points are not a ratio the formatters can take
    asFraction('InstrumentViewResponse.view_points', 1.06)
    // @ts-expect-error a field the backend gives no unit cannot be passed
    asFraction('MatrixCellResponse.ticker', 0.07)
  })
})
