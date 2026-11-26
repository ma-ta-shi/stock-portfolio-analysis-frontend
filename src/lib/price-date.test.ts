import { describe, expect, it } from 'vitest'
import { priceDate } from './price-date'

const now = new Date(2026, 10, 30, 9, 0) // Monday Nov 30

describe('priceDate', () => {
  it('dates a recent price, across a long weekend', () => {
    expect(priceDate('2026-11-26', 'daily_prices', now)).toEqual({ text: 'As of Nov 26, 2026', old: false })
  })

  it('flags a close more than four days old', () => {
    expect(priceDate('2026-11-25', 'daily_prices', now)).toEqual({ text: 'Old: as of Nov 25, 2026', old: true })
  })

  it('says a price with no recorded close is the analysis price, whatever day it carries', () => {
    expect(priceDate(null, null, now)).toEqual({ text: 'Price at last analysis', old: true })
    expect(priceDate('2026-11-30', 'price_band', now)).toEqual({ text: 'Price at last analysis', old: true })
  })
})
