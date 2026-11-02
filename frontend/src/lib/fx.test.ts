import { describe, expect, it } from 'vitest'
import { CAD_ONLY, sumInCad, toCad } from './fx'

const rates = { CAD: 1, USD: 1.4 } as const

describe('toCad', () => {
  it('leaves CAD unchanged', () => {
    expect(toCad(100, 'CAD', rates)).toBe(100)
  })
  it('converts USD with the rate', () => {
    expect(toCad(100, 'USD', rates)).toBeCloseTo(140)
  })
  it('returns null when the rate is unknown', () => {
    expect(toCad(100, 'USD', CAD_ONLY)).toBeNull()
  })
})

describe('sumInCad', () => {
  it('converts each amount before summing', () => {
    const result = sumInCad(
      [
        { amount: 1000, currency: 'CAD' },
        { amount: 1000, currency: 'USD' },
      ],
      rates,
    )
    expect(result.total).toBeCloseTo(2400)
    expect(result.missingCurrencies).toEqual([])
  })
  it('reports currencies it could not convert instead of adding them as CAD', () => {
    const result = sumInCad(
      [
        { amount: 1000, currency: 'CAD' },
        { amount: 1000, currency: 'USD' },
      ],
      CAD_ONLY,
    )
    expect(result.total).toBe(1000)
    expect(result.missingCurrencies).toEqual(['USD'])
  })
})
