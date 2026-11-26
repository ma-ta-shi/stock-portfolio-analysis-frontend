/**
 * Walks every field registry of the wired screens over the recorded API responses and fails on a label that is empty, a value
 * that renders as "undefined" or "NaN", or a get/format that throws. Sits beside `field-coverage.test.ts`, which checks that every
 * API field is decided; this checks that every decided field draws.
 */
import { describe, expect, it } from 'vitest'
import { fieldText, type FieldSpec } from '@/lib/fields'
import { buildSummary, mapHolding, mapTransactions, type ApiHolding, type ApiPositions, type ApiTransaction } from '@/lib/portfolio-mappers'
import type { components } from '@/types/openapi.gen'
import holdingsFixture from '../../public/mock-data/portfolio/holdings.json'
import positionsFixture from '../../public/mock-data/portfolio/positions.json'
import historyFixture from '../../public/mock-data/portfolio/value-history.json'
import reportFixture from '../../public/mock-data/portfolio/report.json'
import accountsFixture from '../../public/mock-data/portfolio/accounts.json'
import roomFixture from '../../public/mock-data/portfolio/room.json'
import transactionsFixture from '../../public/mock-data/portfolio/transactions.json'
import exposureFixture from '../../public/mock-data/portfolio/exposure.json'
import { HOLDING_FIELDS } from './portfolio/holdings'
import { STOCK_ROW_FIELDS } from './stock'
import { SCREEN_FIELD_SETS } from '@/screens'
import { WATCHLIST_FIELDS } from './watchlist'
import { FUNDAMENTAL_FIELDS, HISTORY_FIELDS } from './stock-detail'
import { mapHistory, type ApiPrediction, type ApiRunSummary } from '@/lib/stock-detail'
import runsFixture from '../../public/mock-data/stocks/runs.json'
import predictionsFixture from '../../public/mock-data/stocks/predictions.json'
import { mapWatchlistEntry, type ApiWatchlistEntry } from '@/lib/watchlist'
import watchlistFixture from '../../public/mock-data/watchlist/watchlist.json'
import { PREVIEW_FIELDS, type PreviewRow } from './portfolio/preview'
import { LOOKUP_FIELDS, type StockLookup } from './portfolio/lookup'
import { DIVIDEND_FIELDS, mapDividendEvent, type ApiDividendEvent } from './portfolio/dividends'
import dividendsFixture from '../../public/mock-data/portfolio/dividends.json'
import { TRANSACTION_FIELDS } from './portfolio/ledger'
import { ROOM_FIELDS, SUMMARY_FIELDS } from './portfolio/summary'
import { EXPOSURE_FIELDS } from './portfolio/exposure'

type Api = components['schemas']

function check<Row>(name: string, specs: readonly FieldSpec<Row>[], rows: readonly Row[]) {
  describe(name, () => {
    it('has rows to draw (the recorded fixture is not empty)', () => {
      expect(rows.length).toBeGreaterThan(0)
    })
    for (const spec of specs) {
      it(`draws "${spec.label}" for every row`, () => {
        expect(spec.label.trim()).not.toBe('')
        expect(spec.places.length).toBeGreaterThan(0)
        for (const row of rows) {
          expect(fieldText(spec, row)).not.toMatch(/undefined|NaN|\[object/)
          expect(() => spec.render?.(row)).not.toThrow()
        }
      })
    }
  })
}

const holdings = (holdingsFixture.data as unknown as ApiHolding[]).map((h) => mapHolding(h))
const summaries = (['combined', 'tfsa', 'rrsp', 'trading'] as const).map((view) =>
  buildSummary({
    view,
    positions: positionsFixture as unknown as ApiPositions,
    report: reportFixture as unknown as Api['ReportResponse'],
    history: historyFixture as unknown as Api['ValueHistoryResponse'],
    accounts: (accountsFixture as unknown as { data: Api['PortfolioAccountResponse'][] }).data,
    room: roomFixture as unknown as Api['RoomResponse'],
  }),
)
const room = Object.values((roomFixture as unknown as Api['RoomResponse']).accounts)
const exposure = exposureFixture as unknown as Api['ExposureResponse']

check('holdings', HOLDING_FIELDS, holdings)
// the shared stock fields, over the same rows and one stock with nothing recorded yet
check('stock rows', STOCK_ROW_FIELDS, [...holdings, { stock: holdings[0].stock, call: null }])
// The shared set claims the stock schemas for coverage, which would pass for a field no screen shows: so each must be taken by one.
describe('shared stock fields', () => {
  it('are each used by at least one screen', () => {
    const used = new Set(SCREEN_FIELD_SETS.filter((s) => s.screen !== 'stock').flatMap((s) => s.fields.map((f) => f.id)))
    expect(STOCK_ROW_FIELDS.map((f) => f.id).filter((id) => !used.has(id))).toEqual([])
  })
})
check('stock fundamentals', FUNDAMENTAL_FIELDS, [{ pe_ratio: 12, week_52_low: 1, week_52_high: 2, dividend_yield_trailing: 0.03 }, {}])
check('stock history', HISTORY_FIELDS, mapHistory(holdings[0].stock, runsFixture.data as unknown as ApiRunSummary[], predictionsFixture.data as unknown as ApiPrediction[]))
check('watchlist', WATCHLIST_FIELDS, (watchlistFixture.data as unknown as ApiWatchlistEntry[]).map(mapWatchlistEntry))
check('transactions', TRANSACTION_FIELDS, mapTransactions(transactionsFixture.data as unknown as ApiTransaction[]))
check('summary', SUMMARY_FIELDS, summaries)
check('contribution room', ROOM_FIELDS, room)
check('exposure', EXPOSURE_FIELDS, [exposure])

// The recorded set has no preview, so these are built by hand to match the API's shape (see the seed probe): a CAD purchase, a US sale
// at a gain with a tax estimate, room, a superficial-loss note and a warning, and a cash entry with no position.
const preview = (over: Partial<PreviewRow['preview']>, currency: PreviewRow['currency'] = 'CAD'): PreviewRow => ({
  currency,
  preview: { row: {}, position: null, cash_before: { CAD: 1000, USD: 0 }, cash_after: { CAD: 1000, USD: 0 }, estimated_tax: null, tax_note: null, warnings: [], notes: [], other_effects: [], room: {}, ...over },
})
const position = { shares: 12.5, total_book_cost: 1000, total_book_cost_cad: 1300, average_cost_basis: 80, is_active: true, first_buy_date: '2026-01-02T00:00:00', last_transaction_date: '2026-11-20T00:00:00', total_realized_gain_loss_cad: 0, total_dividends_received_cad: 0, total_fees_paid_cad: 4.99 }
check('entry preview', PREVIEW_FIELDS, [
  preview({ position, cash_before: { CAD: 1000, USD: 0 }, cash_after: { CAD: 400, USD: 0 } }),
  preview(
    {
      position: { ...position, is_active: false, shares: 0 },
      row: { realized_gain_loss: 150, realized_gain_loss_cad: 195, denied_loss_cad: 20, denied_loss_lost_cad: 0 },
      estimated_tax: { capital_gain: 195, taxable_capital_gain: 97.5, estimated_tax: 30.7, marginal_rate: 31.48 },
      room: { tfsa: { before: 1000, after: 900, estimated: true } },
      cash_before: { CAD: 0, USD: 100 }, cash_after: { CAD: 0, USD: 250 },
      tax_note: 'No tax estimate: the profile has no province', warnings: ['Cash goes negative'], notes: ['A superficial loss'], other_effects: ['An earlier sale changes'],
    },
    'USD',
  ),
  preview({ cash_after: { CAD: 1500, USD: 0 } }),
]) // fmt: skip

// Hand-built lookup answers (the recorded set has none): a known stock, one the providers found, and an unsupported fund.
const lookup = (over: Partial<StockLookup> = {}): StockLookup => ({
  stock_id: 's1', ticker: 'BNS.TO', name: 'Bank of Nova Scotia', exchange: 'TSX', currency: 'CAD', sector: 'Financials', industry: 'Banks',
  instrument_type: null, pipeline_supported: true, unsupported_reason: null, source: 'database', ...over,
}) // fmt: skip
check('stock lookup', LOOKUP_FIELDS, [
  lookup(),
  lookup({ stock_id: null, source: 'provider', sector: null, industry: null }),
  lookup({ instrument_type: 'etf', pipeline_supported: false, unsupported_reason: 'a fund' }),
])

// The recorded dividends (waiting ones), and one decided in each way by hand: the fixture was recorded before any was decided.
const dividends = (dividendsFixture.data as unknown as ApiDividendEvent[]).map(mapDividendEvent)
check('dividend events', DIVIDEND_FIELDS, [
  ...dividends,
  { ...dividends[0], status: 'confirmed' as const, decided_by: 'owner' as const, decided_at: '2026-11-22T12:00:00Z', note: 'per statement', planned_reinvest_shares: 0.4, planned_reinvest_price: 100, planned_reinvest_date: '2026-11-23' },
  { ...dividends[0], status: 'dismissed' as const, decided_by: 'owner' as const, decided_at: '2026-11-22T12:00:00Z', flags: ['probable_duplicate'] },
])
