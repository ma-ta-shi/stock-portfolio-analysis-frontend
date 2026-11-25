import { describe, expect, it } from 'vitest'
import { isAwaitingAnalysis, mapWatchlistEntry, watchlistCounts, type ApiWatchlistEntry } from './watchlist'
import recorded from '../../public/mock-data/watchlist/watchlist.json'

// The recorded set: RY.TO with a usable call, TD.TO with an out-of-date one, MSFT never analysed.
const items = (recorded.data as unknown as ApiWatchlistEntry[]).map(mapWatchlistEntry)
const by = (ticker: string) => items.find((i) => i.stock.ticker === ticker)!

describe('mapWatchlistEntry', () => {
  it('gives each entry the stock and call every list of stocks has, with ratios as fractions', () => {
    const ry = by('RY.TO')
    expect(ry.call?.status).toBe('usable')
    expect(ry.call?.analysis?.outlook).toBe('bullish')
    expect(ry.call?.analysis?.expectedReturn).toBeLessThan(1)
    expect(ry.watchlist_id).toBeTruthy()
  })

  it('tells an out-of-date call from none at all', () => {
    expect(by('TD.TO').call?.status).toBe('excluded')
    expect(isAwaitingAnalysis(by('TD.TO'))).toBe(false)
    expect(isAwaitingAnalysis(by('MSFT'))).toBe(true)
    expect(isAwaitingAnalysis({ call: null })).toBe(true)
  })
})

describe('watchlistCounts', () => {
  it('counts the stocks, the bullish outlooks, the unanalysed and the changed', () => {
    expect(watchlistCounts(items)).toEqual({ total: 3, bullish: 2, awaiting: 1, changed: 0 })
    const ry = by('RY.TO')
    const changed = { ...ry, call: { ...ry.call!, analysis: { ...ry.call!.analysis!, outlook: 'somewhat_bearish' as const, outlookChanged: true } } }
    expect(watchlistCounts([changed])).toEqual({ total: 1, bullish: 0, awaiting: 0, changed: 1 })
  })
})
