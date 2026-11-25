import { describe, expect, it } from 'vitest'
import { eventsBody, isDay, optionalFields, round2, tradeEntry, type TradeInput } from './ledger-entry'
import { LEDGER, fillRoute, ledgerRoute } from './ledger-routes'

const buy: TradeInput = {
  kind: 'buy',
  account: 'trading',
  ticker: 'ENB.TO',
  currency: 'CAD',
  shares: 10,
  price: 59.93,
  date: '2026-11-20',
}

describe('tradeEntry', () => {
  it('builds a buy with the total in cents and the day as a plain string', () => {
    expect(tradeEntry(buy)).toEqual({
      account_type: 'trading',
      transaction_type: 'buy',
      ticker: 'ENB.TO',
      shares: 10,
      price_per_share: 59.93,
      total_amount: 599.3,
      currency: 'CAD',
      transaction_date: '2026-11-20',
    })
  })

  it('sends a sale with negative shares and a positive total', () => {
    const body = tradeEntry({ ...buy, kind: 'sell', shares: 4, price: 100 })
    expect(body).toMatchObject({ transaction_type: 'sell', shares: -4, total_amount: 400 })
  })

  it('rounds the total to cents', () => {
    expect(tradeEntry({ ...buy, shares: 3, price: 33.335 })?.total_amount).toBe(100.01)
    expect(round2(1.005)).toBe(1.01)
  })

  it('sends fees only when above zero, rounded to cents', () => {
    expect(tradeEntry({ ...buy, fees: 0 })).not.toHaveProperty('fees')
    expect(tradeEntry({ ...buy, fees: 4.999 })?.fees).toBe(5)
  })

  it('never sends fees for an opening balance', () => {
    expect(tradeEntry({ ...buy, kind: 'opening_balance', fees: 9.99 })).not.toHaveProperty('fees')
  })

  it('sends the exchange rate only for a US row, and never amount_cad', () => {
    const usd = tradeEntry({ ...buy, ticker: 'MSFT', currency: 'USD', rate: 1.3 })
    expect(usd).toMatchObject({ currency: 'USD', fx_rate_to_cad: 1.3 })
    expect(usd).not.toHaveProperty('amount_cad')
    expect(tradeEntry({ ...buy, currency: 'USD', ticker: 'MSFT' })).not.toHaveProperty('fx_rate_to_cad')
    expect(tradeEntry({ ...buy, currency: 'CAD', rate: 1.3 })).not.toHaveProperty('fx_rate_to_cad')
  })

  it('sends the reason and the trimmed notes only when given', () => {
    expect(tradeEntry({ ...buy, reason: 'rebalancing', notes: '  trimmed  ' })).toMatchObject({ reason_code: 'rebalancing', notes: 'trimmed' })
    const plain = tradeEntry({ ...buy, reason: '', notes: '   ' })
    expect(plain).not.toHaveProperty('reason_code')
    expect(plain).not.toHaveProperty('notes')
  })

  it.each([
    ['no shares', { shares: 0 }],
    ['negative shares', { shares: -1 }],
    ['no price', { price: 0 }],
    ['no ticker', { ticker: '' }],
    ['an empty date', { date: '' }],
    ['an impossible date', { date: '2026-02-30' }],
    ['a date with a time', { date: '2026-11-20T09:30:00' }],
  ])('is not valid with %s', (_name, change) => {
    expect(tradeEntry({ ...buy, ...change })).toBeNull()
  })

  it('refuses a sale above the shares held, and allows exactly all of them', () => {
    expect(tradeEntry({ ...buy, kind: 'sell', shares: 11, maxShares: 10 })).toBeNull()
    expect(tradeEntry({ ...buy, kind: 'sell', shares: 10, maxShares: 10 })).not.toBeNull()
  })
})

describe('isDay', () => {
  it('accepts only real calendar days', () => {
    expect(isDay('2026-11-24')).toBe(true)
    expect(isDay('2024-02-29')).toBe(true)
    expect(isDay('2026-02-29')).toBe(false)
    expect(isDay('2026-13-01')).toBe(false)
    expect(isDay('24-11-2026')).toBe(false)
  })
})

describe('optionalFields', () => {
  it('leaves out everything that was not filled in', () => {
    expect(optionalFields({})).toEqual({})
  })
})

describe('eventsBody', () => {
  it('wraps the entries the way the events routes take them', () => {
    const entry = tradeEntry(buy)!
    expect(eventsBody([entry])).toEqual({ events: [entry] })
  })
})

describe('ledger routes', () => {
  it('keeps the method and the path literal', () => {
    expect(LEDGER.events).toEqual({ method: 'POST', path: '/events' })
    expect(LEDGER.eventsPreview.path).toBe('/events/preview')
  })

  it('fills placeholders and encodes them', () => {
    const route = ledgerRoute('POST', '/events/{id}/correct')
    expect(fillRoute(route, { id: 'a b' })).toBe('/events/a%20b/correct')
    expect(fillRoute(LEDGER.events)).toBe('/events')
  })

  it('refuses a missing parameter instead of leaving a hole in the path', () => {
    expect(() => fillRoute(ledgerRoute('POST', '/events/{id}/reverse'))).toThrow(/needs the parameter "id"/)
  })
})
