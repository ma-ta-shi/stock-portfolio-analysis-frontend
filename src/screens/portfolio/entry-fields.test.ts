import { describe, expect, it } from 'vitest'
import { cashEntry, dividendEntries, tradeEntry } from '@/lib/ledger-entry'
import { ENTRY_FIELDS, ENTRY_NOT_SENT, SET_BY_DIALOG } from './entry-fields'

const keyOf = (source: string) => source.slice(source.indexOf('.') + 1)

/** Every body the three forms can build, each with every optional field filled in. */
function everyBody() {
  const trade = tradeEntry({ kind: 'buy', account: 'trading', ticker: 'MSFT', currency: 'USD', shares: 1, price: 1, fees: 1, date: '2026-01-02', rate: 1.3, reason: 'opinion', notes: 'x' })!
  const cash = cashEntry({ kind: 'contribution', account: 'tfsa', amount: 5, currency: 'USD', date: '2026-01-02', rate: 1.3, reason: 'life_need', notes: 'x' })!
  const conversion = cashEntry({ kind: 'conversion', account: 'trading', amount: 5, currency: 'CAD', date: '2026-01-02', counter: { currency: 'USD', amount: 4 }, reason: 'other', notes: 'x' })!
  const dividend = dividendEntries({ account: 'rrsp', ticker: 'FTS.TO', currency: 'USD', gross: 10, withholding: 1, date: '2026-01-02', reinvest: { shares: 0.1, price: 10 }, rate: 1.3, notes: 'x' })!
  return [trade, cash, conversion, ...dividend]
}

describe('entry fields', () => {
  it('ties the registry to what the builders emit: every typed input reaches some body, and nothing else does', () => {
    const emitted = new Set(everyBody().flatMap((body) => Object.keys(body)))
    const inputs = ENTRY_FIELDS.flatMap((f) => [f.source].flat().map(keyOf))
    const setByDialog = Object.keys(SET_BY_DIALOG).map(keyOf)
    expect([...emitted].sort()).toEqual([...new Set([...inputs, ...setByDialog])].sort())
  })

  it('does not call a field both typed and set by the dialog, or typed and not sent', () => {
    const typed = ENTRY_FIELDS.flatMap((f) => [f.source].flat())
    for (const key of Object.keys(SET_BY_DIALOG)) expect(typed).not.toContain(key)
    for (const key of Object.keys(ENTRY_NOT_SENT)) expect(typed).not.toContain(key)
  })

  it('gives every field that is not sent a reason', () => {
    for (const [key, entry] of Object.entries(ENTRY_NOT_SENT)) expect(entry?.reason, key).toBeTruthy()
  })
})
