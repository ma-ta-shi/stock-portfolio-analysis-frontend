import { describe, expect, it } from 'vitest'
import { correctableReason, correctionFamily, initialOf, reversibleReason } from './ledger-correction'
import type { Transaction } from '@/types/portfolio'

// A trade row shaped like the API's, with only what these rules read.
const row = (over: Partial<Transaction> = {}): Transaction =>
  ({
    transaction_id: 't1', holding_id: 'h1', stock: null, account_type: 'trading', transaction_type: 'buy', shares: 10, price_per_share: 50, total_amount: 500, fees: 4.99,
    currency: 'CAD', transaction_date: '2026-11-20T00:00:00', fx_rate_to_cad: null, withholding_tax: null, counter_amount: null, reason_code: null, notes: null,
    reverses_transaction_id: null, reversed_by_transaction_id: null, move_id: null, ...over,
  }) as unknown as Transaction // fmt: skip

describe('correctionFamily', () => {
  it.each([
    ['buy', 'trade'], ['sell', 'trade'], ['opening_balance', 'trade'], ['drip', 'trade'],
    ['dividend', 'dividend'],
  ] as const)('%s uses the %s form', (type, family) => {
    expect(correctionFamily(type)).toBe(family)
  })

  it.each(['transfer_in', 'transfer_out', 'adjustment_in', 'adjustment_out'] as const)('%s has no form', (type) => {
    expect(correctionFamily(type)).toBeNull()
  })
})

describe('correctableReason and reversibleReason', () => {
  it('offers a plain trade both', () => {
    expect(correctableReason(row())).toBeNull()
    expect(reversibleReason(row())).toBeNull()
  })

  it('refuses a reversal row, and a row that is known to be reversed already, with the reason', () => {
    expect(correctableReason(row({ reverses_transaction_id: 'x' }))).toMatch(/itself a reversal/)
    expect(reversibleReason(row({ reversed_by_transaction_id: 'y' }))).toBe('Already reversed')
  })

  it('does not correct one leg of a move, but can reverse it (which reverses the move)', () => {
    expect(correctableReason(row({ move_id: 'm1' }))).toMatch(/leg of a move/)
    expect(reversibleReason(row({ move_id: 'm1' }))).toBeNull()
  })

  it('does not correct a cash entry, a transfer or an adjustment', () => {
    expect(correctableReason(row({ transaction_type: 'adjustment_in' }))).toMatch(/no correction form/)
  })
})

describe('initialOf', () => {
  it('starts a correction from the row: shares positive, the day without its time, fees as recorded', () => {
    expect(initialOf(row({ transaction_type: 'sell', shares: -4 }))).toMatchObject({ shares: 4, price: 50, fees: 4.99, date: '2026-11-20' })
  })

  it('resends the rate of a US row', () => {
    expect(initialOf(row({ currency: 'USD', fx_rate_to_cad: 1.31 })).rate).toBe(1.31)
    expect(initialOf(row()).rate).toBeUndefined()
  })
})
