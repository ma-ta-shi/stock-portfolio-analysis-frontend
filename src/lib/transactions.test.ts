import { describe, expect, it } from 'vitest'
import { EMPTY_FILTERS, isDateRangeInvalid, TRANSACTION_TYPES, transactionsQuery } from './transactions'

describe('transactionsQuery', () => {
  it('is empty for no filters on the whole portfolio', () => {
    expect(transactionsQuery(EMPTY_FILTERS, 'combined')).toBe('')
  })

  it('sends the account switcher as account_type', () => {
    expect(transactionsQuery(EMPTY_FILTERS, 'tfsa')).toBe('?account_type=tfsa')
  })

  it('sends every filter the server understands', () => {
    const query = transactionsQuery({ type: 'sell', ticker: 'RY.TO', from: '2026-01-01', to: '2026-02-01', holdingId: null }, 'trading')
    const params = new URLSearchParams(query)
    expect(Object.fromEntries(params)).toEqual({ account_type: 'trading', type: 'sell', ticker: 'RY.TO', from: '2026-01-01', to: '2026-02-01' })
  })

  it("ignores the account switcher for one position's history (a position belongs to one account)", () => {
    const params = new URLSearchParams(transactionsQuery({ ...EMPTY_FILTERS, holdingId: 'h1' }, 'rrsp'))
    expect(params.get('holding_id')).toBe('h1')
    expect(params.has('account_type')).toBe(false)
  })

  it('adds paging when asked', () => {
    const params = new URLSearchParams(transactionsQuery(EMPTY_FILTERS, 'combined', { page: 3, perPage: 20 }))
    expect(params.get('page')).toBe('3')
    expect(params.get('per_page')).toBe('20')
  })
})

describe('isDateRangeInvalid', () => {
  it('flags a from date after the to date', () => {
    expect(isDateRangeInvalid({ from: '2026-03-01', to: '2026-01-01' })).toBe(true)
  })
  it('accepts open-ended and equal ranges', () => {
    expect(isDateRangeInvalid({ from: '2026-03-01', to: null })).toBe(false)
    expect(isDateRangeInvalid({ from: '2026-03-01', to: '2026-03-01' })).toBe(false)
  })
})

describe('TRANSACTION_TYPES', () => {
  it('lists the 14 ledger types', () => {
    expect(TRANSACTION_TYPES).toHaveLength(14)
  })
})
