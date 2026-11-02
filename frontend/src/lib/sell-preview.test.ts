import { describe, expect, it } from 'vitest'
import { mockHolding, mockUsdHolding } from '@/test/mock-data'
import { estimateSell, FALLBACK_MARGINAL_RATE } from './sell-preview'

const trading = { ...mockHolding, account_type: 'trading', shares: 100, average_cost_basis: 100 }
const identity = (amount: number) => amount

describe('estimateSell', () => {
  it('computes realized gain as (price − avg cost) × shares − fees', () => {
    const p = estimateSell({ holding: trading, shares: 10, price: 150, fees: 10, otherHoldings: [], toCad: identity })
    expect(p.realizedGainLoss).toBe(490)
    expect(p.realizedGainLossPct).toBeCloseTo(490 / 1000)
  })

  it('estimates tax in Trading with 50% inclusion and the profile marginal rate', () => {
    const p = estimateSell({ holding: trading, shares: 10, price: 150, fees: 0, otherHoldings: [], marginalTaxRate: 0.4341, toCad: identity })
    expect(p.tax).toEqual({
      kind: 'estimate',
      capitalGainCad: 500,
      taxableGainCad: 250,
      estimatedTaxCad: 250 * 0.4341,
      marginalRate: 0.4341,
      rateIsAssumed: false,
    })
  })

  it('falls back to an assumed rate when the profile has none', () => {
    const p = estimateSell({ holding: trading, shares: 10, price: 150, fees: 0, otherHoldings: [], toCad: identity })
    expect(p.tax).toMatchObject({ kind: 'estimate', marginalRate: FALLBACK_MARGINAL_RATE, rateIsAssumed: true })
  })

  it('converts a USD gain to CAD before estimating tax', () => {
    const usdTrading = { ...mockUsdHolding, account_type: 'trading' }
    const p = estimateSell({ holding: usdTrading, shares: 1, price: 412.4, fees: 0, otherHoldings: [], marginalTaxRate: 0.5, toCad: (a) => a * 1.4 })
    expect(p.tax).toMatchObject({ kind: 'estimate', capitalGainCad: expect.closeTo(100 * 1.4, 5) })
  })

  it('reports a missing FX rate instead of mislabelling USD as CAD', () => {
    const usdTrading = { ...mockUsdHolding, account_type: 'trading' }
    const p = estimateSell({ holding: usdTrading, shares: 1, price: 412.4, fees: 0, otherHoldings: [], toCad: () => null })
    expect(p.tax).toEqual({ kind: 'no_fx_rate' })
  })

  it('has no tax impact in registered accounts', () => {
    const tfsa = { ...trading, account_type: 'tfsa' }
    const p = estimateSell({ holding: tfsa, shares: 10, price: 150, fees: 0, otherHoldings: [], toCad: identity })
    expect(p.tax).toEqual({ kind: 'none' })
  })

  it('warns about superficial loss when selling at a loss in Trading while held elsewhere', () => {
    const tfsaSame = { ...trading, holding_id: 'h_tfsa', account_type: 'tfsa' }
    const p = estimateSell({ holding: trading, shares: 10, price: 80, fees: 0, otherHoldings: [trading, tfsaSame], toCad: identity })
    expect(p.superficialLossDetail).toContain('TFSA')
  })

  it('does not warn about superficial loss for a gain', () => {
    const tfsaSame = { ...trading, holding_id: 'h_tfsa', account_type: 'tfsa' }
    const p = estimateSell({ holding: trading, shares: 10, price: 150, fees: 0, otherHoldings: [tfsaSame], toCad: identity })
    expect(p.superficialLossDetail).toBeNull()
  })

  it('flags when the sale closes the position', () => {
    expect(estimateSell({ holding: trading, shares: 100, price: 150, fees: 0, otherHoldings: [], toCad: identity }).closesPosition).toBe(true)
    expect(estimateSell({ holding: trading, shares: 99, price: 150, fees: 0, otherHoldings: [], toCad: identity }).closesPosition).toBe(false)
  })
})
