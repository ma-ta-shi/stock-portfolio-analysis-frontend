import { describe, expect, it } from 'vitest'
import { mockHolding, mockUsdHolding } from '@/test/mock-data'
import {
  applyTemplate,
  buildHoldingSnapshot,
  disagreementLabel,
  filterByAccount,
  holdingPeriod,
} from './portfolio'
import { CAD_ONLY } from './fx'

const rates = { CAD: 1, USD: 1.4 } as const

describe('buildHoldingSnapshot', () => {
  it('returns undefined for no holdings', () => {
    expect(buildHoldingSnapshot([], rates)).toBeUndefined()
  })

  it('returns undefined when total shares are zero (no divide-by-zero)', () => {
    expect(buildHoldingSnapshot([{ ...mockHolding, shares: 0 }], rates)).toBeUndefined()
  })

  it('aggregates the same stock across accounts with a weighted average cost', () => {
    const tfsa = { ...mockHolding, shares: 10, average_cost_basis: 100, market_value: 1500, value_cad: 1500, unrealised_cad: 500 }
    const rrsp = { ...mockHolding, holding_id: 'h_x', account_type: 'rrsp' as const, shares: 30, average_cost_basis: 140, market_value: 4500, value_cad: 4500, unrealised_cad: 300 }
    const snap = buildHoldingSnapshot([tfsa, rrsp], rates)!
    expect(snap.shares).toBe(40)
    expect(snap.book_cost).toBe(10 * 100 + 30 * 140)
    expect(snap.average_cost).toBeCloseTo(5200 / 40)
    expect(snap.current_value).toBe(6000)
    expect(snap.total_return_cad).toBe(800)
    expect(snap.total_return_pct).toBeCloseTo(800 / 5200)
    expect(snap.by_account).toHaveLength(2)
  })

  it("shows the server's CAD return for a USD holding and converts only the day change", () => {
    const snap = buildHoldingSnapshot([mockUsdHolding], rates)!
    const h = mockUsdHolding
    // includes the exchange rate's effect since the purchase, so it is not the USD gain at today's rate
    expect(snap.total_return_cad).toBe(h.unrealised_cad)
    expect(snap.total_return_pct).toBeCloseTo(h.unrealised_cad! / (h.value_cad! - h.unrealised_cad!))
    expect(snap.day_change_cad).toBeCloseTo(h.shares * (h.current_price! - h.current_price! / (1 + h.change_day!)) * 1.4)
    // Share-based amounts stay in USD
    expect(snap.current_value).toBe(h.market_value)
  })

  it('leaves the converted day change as NaN (rendered as —) when the USD rate is unknown', () => {
    const snap = buildHoldingSnapshot([mockUsdHolding], CAD_ONLY)!
    expect(snap.day_change_cad).toBeNaN()
  })
})

describe('applyTemplate', () => {
  it('fills known placeholders', () => {
    expect(applyTemplate('You hold {{shares}} in {{account_type}}', { shares: 50, account_type: 'TFSA' }))
      .toBe('You hold 50 in TFSA')
  })
  it('leaves unknown placeholders untouched', () => {
    expect(applyTemplate('{{missing}} stays', {})).toBe('{{missing}} stays')
  })
})

describe('disagreementLabel', () => {
  it.each([
    [0, 'low'],
    [0.249, 'low'],
    [0.25, 'moderate'],
    [0.49, 'moderate'],
    [0.5, 'high'],
  ] as const)('%s → %s', (score, label) => {
    expect(disagreementLabel(score)).toBe(label)
  })
})

describe('filterByAccount', () => {
  const items = [{ account_type: 'tfsa' }, { account_type: 'rrsp' }]
  it('returns everything for combined or no filter', () => {
    expect(filterByAccount(items, 'combined')).toHaveLength(2)
    expect(filterByAccount(items, undefined)).toHaveLength(2)
  })
  it('filters by account', () => {
    expect(filterByAccount(items, 'tfsa')).toEqual([{ account_type: 'tfsa' }])
  })
  it('passes through undefined (still loading)', () => {
    expect(filterByAccount(undefined, 'tfsa')).toBeUndefined()
  })
})

describe('holdingPeriod', () => {
  it.each([
    ['2026-01-01', '2026-01-13', '12d'],
    ['2026-01-01', '2026-06-01', '5mo'],
    ['2024-01-01', '2024-12-25', '1y'],
    ['2024-01-01', '2026-04-01', '2y 3mo'],
    // Regression: the old helper printed "1y 12mo" here
    ['2024-01-01', '2025-12-30', '2y'],
  ])('%s → %s is %s', (from, to, expected) => {
    expect(holdingPeriod(from, to)).toBe(expected)
  })
  it('never goes negative', () => {
    expect(holdingPeriod('2026-02-01', '2026-01-01')).toBe('0d')
  })
})
