import { describe, expect, it } from 'vitest'
import { findMockTicker } from './use-ticker-search'

describe('findMockTicker', () => {
  it('matches an exact ticker case-insensitively', () => {
    expect(findMockTicker('ry.to')?.stock_id).toBe('stk_ry_to')
  })
  it('matches a partial company name', () => {
    expect(findMockTicker('shopify')?.ticker).toBe('SHOP.TO')
  })
  it('prefers an exact ticker over a name match', () => {
    expect(findMockTicker('MSFT')?.stock_id).toBe('stk_msft')
  })
  it('returns null for no match or blank input', () => {
    expect(findMockTicker('zzzz')).toBeNull()
    expect(findMockTicker('   ')).toBeNull()
  })
})
