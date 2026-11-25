import { describe, expect, it } from 'vitest'
import {
  accountParam,
  annualIncomeEstimateCad,
  buildSummary,
  mapHolding,
  mapTransactions,
  type ApiHolding,
  type ApiPositions,
  type ApiTransaction,
} from './portfolio-mappers'
import holdingsFixture from '../../public/mock-data/portfolio/holdings.json'
import positionsFixture from '../../public/mock-data/portfolio/positions.json'
import historyFixture from '../../public/mock-data/portfolio/value-history.json'
import reportFixture from '../../public/mock-data/portfolio/report.json'
import accountsFixture from '../../public/mock-data/portfolio/accounts.json'
import roomFixture from '../../public/mock-data/portfolio/room.json'
import transactionsFixture from '../../public/mock-data/portfolio/transactions.json'
import type { components } from '@/types/openapi.gen'

// Every row below is a recorded API response (`npm run record:fixtures`), except where a test says it is built by hand.
const holdings = holdingsFixture.data as unknown as ApiHolding[]
const raw = (ticker: string) => holdings.find((h) => h.stock.ticker === ticker)!
const positions = positionsFixture as unknown as ApiPositions

describe('mapHolding', () => {
  it('turns the position and snapshot into one row with whole percents as fractions', () => {
    const h = mapHolding(raw('RY.TO'))
    expect(h.shares).toBe(40)
    expect(h.current_price).toBe(263.05)
    expect(h.market_value).toBeCloseTo(40 * 263.05)
    expect(h.total_gain_loss).toBeCloseTo(40 * 263.05 - h.total_book_cost)
    expect(h.unrealised_pct).toBeCloseTo(0.0911) // the API's 9.11 whole percent
    expect(h.weight).toBeCloseTo(0.1362)
    expect(h.value_cad).toBe(10522)
  })

  it('keeps a usable call, and names the exclusions of an unusable one', () => {
    expect(mapHolding(raw('RY.TO')).call?.status).toBe('usable')
    const stale = mapHolding(raw('TD.TO'))
    expect(stale.call?.status).toBe('excluded')
    expect(stale.call?.exclusions).toEqual(['stale'])
    expect(stale.call?.analysis?.outlook).toBe('somewhat_bullish') // the call is still shown
  })

  it('has no call for an instrument the pipeline cannot analyse', () => {
    const fund = mapHolding(raw('VFV.TO'))
    expect(fund.stock.pipeline_supported).toBe(false)
    expect(fund.call?.analysis).toBeNull()
  })

  it('values a USD holding in USD, with the CAD figures beside it', () => {
    const usd = mapHolding(raw('RDDT'))
    expect(usd.stock.currency).toBe('USD')
    expect(usd.market_value).toBeCloseTo(40 * 85.33, 1)
    expect(usd.value_cad).toBe(4879.51)
    expect(usd.unrealised_cad).toBe(-232.09)
    expect(usd.unrealised_fx_cad).toBe(442.35)
  })

  it('gives a closed position no market value', () => {
    const closed = mapHolding(raw('XOM'))
    expect(closed.is_active).toBe(false)
    expect(closed.market_value).toBeNull()
    expect(closed.total_gain_loss).toBeNull()
  })

  it('derives yield from the expected income over the price and over the average cost', () => {
    const h = mapHolding(raw('RY.TO'))
    const income = h.expected_income_per_share
    if (income == null) return
    expect(h.dividend_yield).toBeCloseTo(income / 263.05)
    expect(h.yield_on_cost).toBeCloseTo(income / 241.08)
  })

  it('attaches the broker confirmation of the position when the backend has one', () => {
    const first = positions.confirmations.find((c) => c.kind === 'position')
    if (!first) return
    const row = holdings.find((h) => h.stock.ticker === first.what && h.account_type === first.account_type)!
    expect(mapHolding(row, positions.confirmations).confirmation?.ageDays).toBe(first.age_days)
  })
})

describe('mapTransactions', () => {
  const rows = transactionsFixture.data as unknown as ApiTransaction[]

  it('maps every recorded row, keeping the owner day as written', () => {
    const mapped = mapTransactions(rows)
    expect(mapped).toHaveLength(rows.length)
    expect(mapped[0].transaction_date).toBe(rows[0].transaction_date) // no offset: a day, not an instant
  })

  it('marks a row that a later row in the list reverses (built by hand: the recorded ledger has no reversal; gap P-T1)', () => {
    const base = rows[0]
    const original = { ...base, transaction_id: 'orig' }
    const reversal = { ...base, transaction_id: 'rev', reverses_transaction_id: 'orig' }
    const mapped = mapTransactions([reversal, original])
    expect(mapped.find((t) => t.transaction_id === 'orig')?.reversed_by_transaction_id).toBe('rev')
    expect(mapped.find((t) => t.transaction_id === 'rev')?.reversed_by_transaction_id).toBeNull()
  })

  it('converts the realised percent to a fraction', () => {
    const sale = { ...rows[0], realized_gain_loss: 50, realized_gain_loss_pct: 5 }
    expect(mapTransactions([sale])[0].realized_gain_loss_pct).toBeCloseTo(0.05)
  })
})

describe('buildSummary', () => {
  const parts = {
    positions,
    report: reportFixture as unknown as components['schemas']['ReportResponse'],
    history: historyFixture as unknown as components['schemas']['ValueHistoryResponse'],
    accounts: (accountsFixture as unknown as { data: components['schemas']['PortfolioAccountResponse'][] }).data,
    room: roomFixture as unknown as components['schemas']['RoomResponse'],
  }

  it('reads the whole portfolio from the total scope', () => {
    const s = buildSummary({ view: 'combined', ...parts })
    expect(s.total_value_cad).toBe(positions.total.value_cad)
    expect(s.total_gain_loss_cad).toBe(positions.total.unrealised_cad)
    const cost = positions.total.positions.reduce((sum, p) => sum + p.cost_cad, 0)
    expect(s.total_gain_loss_pct).toBeCloseTo(positions.total.unrealised_cad / cost)
    expect(s.report).toEqual(parts.report.total)
    expect(s.unavailable).toEqual({ report: false, history: false, accounts: false, room: false })
  })

  it('reads one account from its own scope and report', () => {
    const s = buildSummary({ view: 'tfsa', ...parts })
    expect(s.total_value_cad).toBe(positions.accounts.tfsa!.value_cad)
    expect(s.report).toEqual(parts.report.accounts.tfsa ?? null)
  })

  it('takes the change at the last close from the last two recorded days', () => {
    const [prev, last] = parts.history.points.slice(-2)
    const s = buildSummary({ view: 'combined', ...parts })
    expect(s.day_change_from).toBe(prev.day)
    expect(s.day_change_to).toBe(last.day)
    expect(s.day_change_cad).toBeCloseTo(last.value_cad - prev.value_cad)
  })

  it('flags a change that includes cash or trades when the history cannot separate them (gap P-D2)', () => {
    const [a, b] = parts.history.points.slice(-2)
    const moved = { ...parts.history, points: [a, { ...b, cash_cad: a.cash_cad + 1000 }] }
    expect(buildSummary({ view: 'combined', ...parts, history: moved }).day_change_includes_flows).toBe(true)
  })

  it('flags the parts that did not load instead of guessing them', () => {
    const s = buildSummary({ view: 'combined', positions, report: null, history: null, accounts: null, room: null, roomError: 'profile incomplete' })
    expect(s.unavailable).toEqual({ report: true, history: true, accounts: true, room: true })
    expect(s.day_change_cad).toBeNull()
    expect(s.room_error).toBe('profile incomplete')
  })
})

describe('annualIncomeEstimateCad', () => {
  it('is null when there is nothing to estimate from', () => {
    expect(annualIncomeEstimateCad([], 'combined')).toBeNull()
  })

  it('sums expected income per share over the position, in Canadian dollars, skipping holdings with no call', () => {
    const rows = holdings.map((h) => mapHolding(h))
    const expected = rows
      .filter((h) => h.is_active && h.expected_income_per_share != null && h.value_cad != null && h.current_price)
      .reduce((sum, h) => sum + (h.expected_income_per_share! * h.value_cad!) / h.current_price!, 0)
    const total = annualIncomeEstimateCad(rows, 'combined')
    if (expected === 0) expect(total).toBeNull()
    else expect(total).toBeCloseTo(expected)
  })
})

describe('accountParam', () => {
  it('sends no account for the whole portfolio, and the account otherwise', () => {
    expect(accountParam('combined')).toBeUndefined()
    expect(accountParam('rrsp')).toBe('rrsp')
  })
})
