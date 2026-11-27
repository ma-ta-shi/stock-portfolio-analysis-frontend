import { describe, expect, it } from 'vitest'
import { dividendCorrections, dividendEntries, dividendProblem, eventsBody, isDay, optionalFields, round2, tradeEntry, type DividendInput, type TradeInput } from './ledger-entry'
import { LEDGER, fillRoute, ledgerRoute } from './ledger-routes'

const buy: TradeInput = {
  kind: 'buy',
  account: 'trading',
  ticker: 'ENB.TO',
  currency: 'CAD',
  shares: 10,
  price: 61.37,
  date: '2026-11-20',
}

describe('tradeEntry', () => {
  it('builds a buy with the total in cents and the day as a plain string', () => {
    expect(tradeEntry(buy)).toEqual({
      account_type: 'trading',
      transaction_type: 'buy',
      ticker: 'ENB.TO',
      shares: 10,
      price_per_share: 61.37,
      total_amount: 613.7,
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

describe('tradeEntry: an opening balance', () => {
  const opening: TradeInput = { ...buy, kind: 'opening_balance' }

  it('is an ordinary entry for a Canadian stock', () => {
    expect(tradeEntry(opening)).toMatchObject({ transaction_type: 'opening_balance', shares: 10, total_amount: 613.7 })
  })

  it('must state the exchange rate for a US stock: no day has a rate to look up for something bought before the record began', () => {
    const usd = { ...opening, ticker: 'MSFT', currency: 'USD' as const }
    expect(tradeEntry(usd)).toBeNull()
    expect(tradeEntry({ ...usd, rate: 1.3 })).toMatchObject({ currency: 'USD', fx_rate_to_cad: 1.3 })
  })
})

describe('dividendEntries', () => {
  const paid: DividendInput = { account: 'rrsp', ticker: 'FTS.TO', currency: 'CAD', gross: 20, date: '2026-11-20' }

  it('builds one dividend row: the gross as the amount and no shares', () => {
    expect(dividendEntries(paid)).toEqual([
      { account_type: 'rrsp', transaction_type: 'dividend', ticker: 'FTS.TO', total_amount: 20, currency: 'CAD', transaction_date: '2026-11-20' },
    ])
  })

  it('sends the tax withheld only when above zero', () => {
    expect(dividendEntries({ ...paid, withholding: 3 })![0]).toMatchObject({ withholding_tax: 3 })
    expect(dividendEntries({ ...paid, withholding: 0 })![0]).not.toHaveProperty('withholding_tax')
  })

  it('adds the drip row in the same call when it was reinvested, on the same day and at the same rate', () => {
    const rows = dividendEntries({ ...paid, currency: 'USD', rate: 1.3, withholding: 3, reinvest: { shares: 0.17, price: 100 } })!
    expect(rows).toHaveLength(2)
    expect(rows[1]).toMatchObject({ transaction_type: 'drip', ticker: 'FTS.TO', shares: 0.17, price_per_share: 100, total_amount: 17, transaction_date: '2026-11-20', fx_rate_to_cad: 1.3 })
    expect(rows[0]).toMatchObject({ fx_rate_to_cad: 1.3 })
  })

  it('refuses tax above the dividend, and a reinvestment above what was paid', () => {
    expect(dividendEntries({ ...paid, withholding: 21 })).toBeNull()
    expect(dividendProblem({ gross: 20, withholding: 21 })).toMatch(/tax withheld/)
    expect(dividendEntries({ ...paid, reinvest: { shares: 0.21, price: 100 } })).toBeNull()
    expect(dividendProblem({ gross: 20, reinvest: { shares: 0.21, price: 100 } })).toMatch(/more than the dividend paid/)
    expect(dividendEntries({ ...paid, withholding: 5, reinvest: { shares: 0.16, price: 100 } })).toBeNull() // 16 is above the 15 that arrived
    expect(dividendEntries({ ...paid, withholding: 5, reinvest: { shares: 0.15, price: 100 } })).not.toBeNull()
  })

  it('has no problem to report for a valid entry', () => {
    expect(dividendProblem({ gross: 20, withholding: 3, reinvest: { shares: 0.17, price: 100 } })).toBeNull()
  })

  it.each([
    ['no gross', { gross: 0 }],
    ['no ticker', { ticker: '' }],
    ['an empty date', { date: '' }],
    ['a reinvestment with no shares', { reinvest: { shares: 0, price: 100 } }],
    ['a reinvestment with no price', { reinvest: { shares: 0.1, price: 0 } }],
  ])('is not valid with %s', (_name, change) => {
    expect(dividendEntries({ ...paid, ...change })).toBeNull()
  })
})

describe('tradeEntry: a reinvestment (drip)', () => {
  it('is a stock row with no fees, bought at the price paid', () => {
    expect(tradeEntry({ ...buy, kind: 'drip', shares: 0.17, price: 100, fees: 9.99 })).toEqual({
      account_type: 'trading', transaction_type: 'drip', ticker: 'ENB.TO', shares: 0.17, price_per_share: 100, total_amount: 17, currency: 'CAD', transaction_date: '2026-11-20',
    })
  })
})

describe('dividendCorrections', () => {
  it('is an empty body when nothing was typed: confirm the calculated dividend', () => {
    expect(dividendCorrections({})).toEqual({})
  })

  it('sends only what was typed', () => {
    expect(dividendCorrections({ gross: 20 })).toEqual({ gross: 20 })
    expect(dividendCorrections({ withholding: 0 })).toEqual({ withholding_tax: 0 }) // no tax is a figure, not a blank
  })

  it('sends the reinvestment choice, including an explicit "do not reinvest"', () => {
    expect(dividendCorrections({ reinvest: true, reinvestShares: 0.15, reinvestPrice: 100, reinvestDate: '2026-11-22' })).toEqual({
      reinvest: true, reinvest_shares: 0.15, reinvest_price: 100, reinvest_date: '2026-11-22',
    }) // fmt: skip
    expect(dividendCorrections({ reinvest: false })).toEqual({ reinvest: false })
    expect(dividendCorrections({ reinvest: null })).toEqual({})
  })

  it.each([
    ['a gross of zero', { gross: 0 }],
    ['a negative tax', { withholding: -1 }],
    ['tax above the dividend', { gross: 10, withholding: 11 }],
    ['a reinvestment price of zero', { reinvestPrice: 0 }],
    ['a payment day that is not a day', { paymentDate: '2026-13-01' }],
  ])('is not valid with %s', (_name, input) => {
    expect(dividendCorrections(input)).toBeNull()
  })
})

