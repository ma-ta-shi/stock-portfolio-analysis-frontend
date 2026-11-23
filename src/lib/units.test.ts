import { describe, expect, it } from 'vitest'
import { asFraction } from './units'

// The table's keys are checked against the generated API types by the compiler (see `units.ts`): a `_pct` field that is
// not listed, or a key that is not an API field, fails `tsc`. These tests cover the conversion itself.

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

  it('does not compile for a field that is points or unclassified', () => {
    // @ts-expect-error percentage points are not a ratio the formatters can take
    asFraction('InstrumentViewResponse.view_points', 1.06)
    // @ts-expect-error an unclassified field cannot be passed
    asFraction('MatrixCellResponse.total_return_quote', 0.07)
  })
})
