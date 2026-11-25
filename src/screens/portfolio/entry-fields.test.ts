import { describe, expect, it } from 'vitest'
import { dividendCorrections, dividendEntries, tradeEntry } from '@/lib/ledger-entry'
import { ENTRY_FIELDS, ENTRY_NOT_SENT, SET_BY_DIALOG } from './entry-fields'

const keyOf = (source: string) => source.slice(source.indexOf('.') + 1)
const inSchema = (schema: string) => (source: string) => source.startsWith(`${schema}.`)

/** Every body each builder can make, with every optional field filled in, for each request schema the write forms send. */
const FAMILIES: Record<string, () => object[]> = {
  TransactionCreate: () => {
    const trade = tradeEntry({ kind: 'buy', account: 'trading', ticker: 'MSFT', currency: 'USD', shares: 1, price: 1, fees: 1, date: '2026-01-02', rate: 1.3 })!
    const dividend = dividendEntries({ account: 'rrsp', ticker: 'FTS.TO', currency: 'USD', gross: 10, withholding: 1, date: '2026-01-02', reinvest: { shares: 0.1, price: 10 }, rate: 1.3 })!
    return [trade, ...dividend]
  },
  DividendCorrections: () => [dividendCorrections({ gross: 10, withholding: 1, paymentDate: '2026-01-02', reinvest: true, reinvestShares: 0.1, reinvestPrice: 10, reinvestDate: '2026-01-03' })!],
}

describe('entry fields', () => {
  describe.each(Object.entries(FAMILIES))('%s', (schema, bodies) => {
    it('ties the registry to what the builders emit: every typed input reaches a body, and nothing else does', () => {
      const emitted = new Set(bodies().flatMap((body) => Object.keys(body)))
      const inputs = ENTRY_FIELDS.flatMap((f) => [f.source].flat()).filter(inSchema(schema)).map(keyOf)
      const setByDialog = Object.keys(SET_BY_DIALOG).filter(inSchema(schema)).map(keyOf)
      expect([...emitted].sort()).toEqual([...new Set([...inputs, ...setByDialog])].sort())
    })
  })

  it('has no body that failed to build (a null in a family would hide a missing key)', () => {
    for (const bodies of Object.values(FAMILIES)) expect(bodies().every((b) => b != null)).toBe(true)
  })

  it('does not call a field both typed and set by the dialog, or typed and not sent', () => {
    const typed = ENTRY_FIELDS.flatMap((f) => [f.source].flat())
    for (const key of Object.keys(SET_BY_DIALOG)) expect(typed).not.toContain(key)
    for (const key of Object.keys(ENTRY_NOT_SENT)) {
      if (key in SET_BY_DIALOG) continue
      expect(typed).not.toContain(key)
    }
  })

  it('gives every field that is not sent a reason', () => {
    for (const [key, entry] of Object.entries(ENTRY_NOT_SENT)) expect(entry?.reason, key).toBeTruthy()
  })
})
