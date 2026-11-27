import { describe, expect, it } from 'vitest'
import { installFixtureFetch, recordingFor, recordingId } from './fixture-fetch'
import routes from './fixture-routes.json'

const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10)
const recorded = Object.keys(import.meta.glob('../../public/mock-data/**/*.json')).map((p) => p.replace('../../public/mock-data/', '').replace('.json', ''))

describe('the recordings and the requests that answer with them', () => {
  it('every route of the table has its recording', () => {
    expect(routes.map(recordingId).filter((id) => !recorded.includes(id))).toEqual([])
  })

  it('refuses an override of a recording that does not exist', () => {
    expect(() => installFixtureFetch({ 'stocks/stok': 500 })).toThrow('No recording is called stocks/stok')
  })

  it.each([
    ['GET', '/api/stocks/snapshots?stock_ids=s1', undefined, 'stocks/snapshot'],
    ['GET', '/api/stocks/s1', undefined, 'stocks/stock'],
    ['GET', '/api/predictions?stock_id=s1&from=2026-10-13&page=1&per_page=100', undefined, 'stocks/predictions'],
    ['GET', '/api/predictions?current_design=true&page=1&per_page=20', undefined, 'feedback/predictions'],
    ['GET', `/api/portfolios/p1/value-history?from=${day(-30)}&to=${day(0)}`, undefined, 'portfolio/value-history'],
    ['GET', `/api/portfolios/p1/value-history?from=${day(-365)}&to=${day(0)}`, undefined, 'portfolio/value-history-year'],
    ['POST', '/api/portfolios/p1/reports', { preset: 'since_inception' }, 'portfolio/report'],
    ['POST', '/api/portfolios/p1/reports', { start: day(-30), end: day(0) }, 'portfolio/report-30d'],
    ['GET', '/api/users', undefined, 'users'],
    ['GET', '/api/users/u1', undefined, 'settings/profile'],
    // not a stock's id, a route nothing records, a wrong query and a write
    ['GET', '/api/stocks/lookup?ticker=RY.TO', undefined, null],
    ['GET', '/api/portfolios/p1/nothing', undefined, null],
    ['GET', '/api/scorecard?section=other', undefined, null],
    ['POST', '/api/watchlist', { ticker: 'RY.TO' }, null],
  ])('%s %s answers with %s', (method, url, body, expected) => {
    expect(recordingFor(method, url, body)).toBe(expected)
  })
})
