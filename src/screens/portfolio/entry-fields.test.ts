import { describe, expect, it } from 'vitest'
import { tradeEntry } from '@/lib/ledger-entry'
import { ENTRY_FIELDS, ENTRY_NOT_SENT, SET_BY_DIALOG } from './entry-fields'

const keyOf = (source: string) => source.slice(source.indexOf('.') + 1)

describe('entry fields', () => {
  it('ties the registry to what the trade builder emits: every typed input reaches the body, and nothing else does', () => {
    const body = tradeEntry({
      kind: 'buy', account: 'trading', ticker: 'MSFT', currency: 'USD', shares: 1, price: 1, fees: 1,
      date: '2026-01-02', rate: 1.3, reason: 'opinion', notes: 'x',
    })! // fmt: skip
    const inputs = ENTRY_FIELDS.flatMap((f) => [f.source].flat().map(keyOf))
    const setByDialog = Object.keys(SET_BY_DIALOG).map(keyOf)
    expect(Object.keys(body).sort()).toEqual([...new Set([...inputs, ...setByDialog])].sort())
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
