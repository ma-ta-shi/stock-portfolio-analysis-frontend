import { describe, expect, it } from 'vitest'
import { mockHolding, mockUsdHolding } from '@/test/mock-data'
import type { Transaction } from '@/types'
import {
  EMPTY_FILTERS,
  filterTransactions,
  isDateRangeInvalid,
  tickersIn,
  transactionDay,
} from './transactions'

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    transaction_id: 't',
    holding_id: 'h_001',
    user_id: 'user_01',
    stock: mockHolding.stock,
    account_type: 'tfsa',
    transaction_type: 'buy',
    shares: 10,
    price_per_share: 100,
    total_amount: 1000,
    fees: 0,
    currency: 'CAD',
    transaction_date: '2026-03-01',
    created_at: '2026-03-01T00:00:00Z',
    ...overrides,
  }
}

const all = [
  tx({ transaction_id: 'a', transaction_date: '2026-01-10', transaction_type: 'buy' }),
  tx({ transaction_id: 'b', transaction_date: '2026-02-15', transaction_type: 'dividend' }),
  tx({ transaction_id: 'c', transaction_date: '2026-03-20', transaction_type: 'sell', holding_id: 'h_002', stock: mockUsdHolding.stock }),
]
const ids = (list: Transaction[]) => list.map((t) => t.transaction_id)

describe('filterTransactions', () => {
  it('returns everything newest first with no filters', () => {
    expect(ids(filterTransactions(all, EMPTY_FILTERS))).toEqual(['c', 'b', 'a'])
  })
  it('filters by type', () => {
    expect(ids(filterTransactions(all, { ...EMPTY_FILTERS, type: 'dividend' }))).toEqual(['b'])
  })
  it('filters by ticker', () => {
    expect(ids(filterTransactions(all, { ...EMPTY_FILTERS, ticker: 'MSFT' }))).toEqual(['c'])
  })
  it('filters by holding (one position’s history)', () => {
    expect(ids(filterTransactions(all, { ...EMPTY_FILTERS, holdingId: 'h_001' }))).toEqual(['b', 'a'])
  })
  it('includes both ends of the date range', () => {
    expect(ids(filterTransactions(all, { ...EMPTY_FILTERS, from: '2026-01-10', to: '2026-02-15' }))).toEqual(['b', 'a'])
  })
  it('supports open-ended ranges', () => {
    expect(ids(filterTransactions(all, { ...EMPTY_FILTERS, from: '2026-02-01' }))).toEqual(['c', 'b'])
    expect(ids(filterTransactions(all, { ...EMPTY_FILTERS, to: '2026-02-01' }))).toEqual(['a'])
  })
  it('compares local calendar days, not UTC (9pm Toronto on Nov 2 is Nov 3 in UTC)', () => {
    const evening = tx({ transaction_id: 'e', transaction_date: '2026-11-03T02:00:00Z' })
    expect(transactionDay(evening)).toBe('2026-11-02')
    expect(ids(filterTransactions([evening], { ...EMPTY_FILTERS, to: '2026-11-02' }))).toEqual(['e'])
  })
  it('combines filters', () => {
    expect(ids(filterTransactions(all, { ...EMPTY_FILTERS, ticker: 'RY.TO', type: 'buy', from: '2026-01-01' }))).toEqual(['a'])
  })
  it('returns nothing for an inverted date range', () => {
    const filters = { ...EMPTY_FILTERS, from: '2026-03-01', to: '2026-01-01' }
    expect(isDateRangeInvalid(filters)).toBe(true)
    expect(filterTransactions(all, filters)).toEqual([])
  })
  it('does not mutate the input', () => {
    const copy = [...all]
    filterTransactions(all, EMPTY_FILTERS)
    expect(all).toEqual(copy)
  })
})

describe('tickersIn', () => {
  it('returns sorted unique tickers', () => {
    expect(tickersIn([...all, ...all])).toEqual(['MSFT', 'RY.TO'])
  })
})
