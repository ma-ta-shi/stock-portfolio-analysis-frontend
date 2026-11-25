/**
 * Walks every field registry of the Portfolio screen over the recorded API responses and fails on a label that is empty, a value
 * that renders as "undefined" or "NaN", or a get/format that throws. Sits beside `field-coverage.test.ts`, which checks that every
 * API field is decided; this checks that every decided field draws.
 */
import { describe, expect, it } from 'vitest'
import { fieldText, type FieldSpec } from '@/lib/fields'
import { buildSummary, mapHolding, mapTransactions, type ApiHolding, type ApiPositions, type ApiTransaction } from '@/lib/portfolio-mappers'
import type { components } from '@/types/openapi.gen'
import holdingsFixture from '../../../public/mock-data/portfolio/holdings.json'
import positionsFixture from '../../../public/mock-data/portfolio/positions.json'
import historyFixture from '../../../public/mock-data/portfolio/value-history.json'
import reportFixture from '../../../public/mock-data/portfolio/report.json'
import accountsFixture from '../../../public/mock-data/portfolio/accounts.json'
import roomFixture from '../../../public/mock-data/portfolio/room.json'
import transactionsFixture from '../../../public/mock-data/portfolio/transactions.json'
import exposureFixture from '../../../public/mock-data/portfolio/exposure.json'
import { HOLDING_FIELDS } from './holdings'
import { TRANSACTION_FIELDS } from './ledger'
import { ACCOUNT_FIELDS, ROOM_EVENT_FIELDS, ROOM_FIELDS, SUMMARY_FIELDS } from './summary'
import { EXPOSURE_FIELDS, EXPOSURE_GROUP_FIELDS, EXPOSURE_NAME_FIELDS, EXPOSURE_PAIR_FIELDS, EXPOSURE_RISK_FIELDS, type RiskRow } from './exposure'

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
const pairs = [...exposure.near_misses, ...exposure.correlations]
const events = room.flatMap((r) => r.events)

check('holdings', HOLDING_FIELDS, holdings)
check('transactions', TRANSACTION_FIELDS, mapTransactions(transactionsFixture.data as unknown as ApiTransaction[]))
check('summary', SUMMARY_FIELDS, summaries)
check('account', ACCOUNT_FIELDS, (accountsFixture as unknown as { data: Api['PortfolioAccountResponse'][] }).data)
check('contribution room', ROOM_FIELDS, room)
check('exposure', EXPOSURE_FIELDS, [exposure])
check('exposure names', EXPOSURE_NAME_FIELDS, exposure.names)
// The recorded portfolio may have no correlated group, pair or room event; those rows are built by hand and marked so.
check('exposure groups', EXPOSURE_GROUP_FIELDS, exposure.groups.length ? exposure.groups : [{ members: ['A', 'B'], weight: 0.1 }])
check('exposure pairs', EXPOSURE_PAIR_FIELDS, pairs.length ? pairs : [{ a: 'A', b: 'B', rho: 0.5 }])
check('exposure risk', EXPOSURE_RISK_FIELDS, Object.entries(exposure.risk).map(([ticker, r]) => ({ ticker, ...r }) as RiskRow))
check('room events', ROOM_EVENT_FIELDS, events.length ? events : [{ when: '2026-01-01', kind: 'contribution', change: 100, room_after: 900, detail: 'by hand' }])
