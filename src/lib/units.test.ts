import { describe, expect, it } from 'vitest'
import snapshot from '../../openapi.snapshot.json'
import { UNITS, asFraction, fromPercent } from './units'

type Schema = { properties?: Record<string, unknown> }
const schemas = (snapshot as { components: { schemas: Record<string, Schema> } }).components.schemas

describe('fromPercent', () => {
  it('turns a whole percent into a fraction', () => {
    expect(fromPercent(9.11)).toBeCloseTo(0.0911)
    expect(fromPercent(-20.63)).toBeCloseTo(-0.2063)
    expect(fromPercent(0)).toBe(0)
  })
  it('passes null and undefined through', () => {
    expect(fromPercent(null)).toBeNull()
    expect(fromPercent(undefined)).toBeNull()
  })
})

describe('asFraction', () => {
  it('divides a whole percent and leaves a fraction alone', () => {
    expect(asFraction('PositionLineResponse.unrealised_pct', 9.11)).toBeCloseTo(0.0911)
    expect(asFraction('InstrumentViewResponse.expected_total_return', 0.0678)).toBe(0.0678)
    expect(asFraction('price_band.vs_current_pct.low', -20.63)).toBeCloseTo(-0.2063)
  })

  it('passes null and undefined through for both scales', () => {
    expect(asFraction('PositionLineResponse.unrealised_pct', null)).toBeNull()
    expect(asFraction('InstrumentViewResponse.valuation_edge', undefined)).toBeNull()
  })

  it('does not compile for a field that is points or unverified', () => {
    // @ts-expect-error percentage points are not a ratio the formatters can take
    asFraction('InstrumentViewResponse.view_points', 1.06)
    // @ts-expect-error a field whose scale is unconfirmed must be checked before it is used
    asFraction('UserProfileResponse.marginal_tax_rate_override_pct', 30)
    // @ts-expect-error an unclassified field cannot be passed
    asFraction('MatrixCellResponse.total_return_quote', 0.07)
  })
})

describe('UNITS', () => {
  it('classifies every `_pct` field of the generated API schema', () => {
    const missing: string[] = []
    for (const [schema, def] of Object.entries(schemas)) {
      for (const prop of Object.keys(def.properties ?? {})) {
        if (prop.endsWith('_pct') && !(`${schema}.${prop}` in UNITS)) missing.push(`${schema}.${prop}`)
      }
    }
    // A new `_pct` field must be checked on a running backend, then added to UNITS (src/lib/units.ts).
    expect(missing).toEqual([])
  })

  it('lists no typed field that the schema no longer has', () => {
    const stale = Object.keys(UNITS).filter((key) => {
      const [schema, prop] = key.split('.')
      return key in UNITS && schemas[schema] !== undefined && !(prop in (schemas[schema].properties ?? {}))
    })
    expect(stale).toEqual([])
  })
})
