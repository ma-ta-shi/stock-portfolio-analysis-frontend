import { describe, expect, it } from 'vitest'
import type { WatchlistItem } from '@/types'
import { isAwaitingAnalysis, sortWatchlist } from './watchlist'

const item = (id: string, overrides: Partial<WatchlistItem>): WatchlistItem => ({
  watchlist_id: id, user_id: 'u',
  stock: { stock_id: id, ticker: id, name: id, sector: 'X', exchange: 'TSX', currency: 'CAD' },
  current_price: 10, day_change: 0, day_change_pct: 0, week_change_pct: 0, month_change_pct: 0,
  stock_outlook: 'neutral', projected_return_pct: 0, portfolio_fit: 'worth_monitoring',
  confidence_score: 50, disagreement_score: 0.1, disagreement_label: 'low', suggested_account: 'tfsa',
  last_analyzed_at: '2026-03-01T00:00:00Z', added_at: '2026-01-01T00:00:00Z',
  ...overrides,
})

const awaiting = { stock_outlook: null, projected_return_pct: null, confidence_score: null, last_analyzed_at: null, day_change_pct: null }
const list = [
  item('low', { projected_return_pct: 0.05, confidence_score: 40, last_analyzed_at: '2026-01-01' }),
  item('new', awaiting),
  item('high', { projected_return_pct: 0.2, confidence_score: 90, last_analyzed_at: '2026-03-01' }),
]
const ids = (l: WatchlistItem[]) => l.map((i) => i.watchlist_id)

describe('sortWatchlist', () => {
  it.each(['projected_return_pct', 'confidence_score', 'last_analyzed_at'] as const)(
    'sorts by %s and keeps unanalysed stocks last in both directions',
    (key) => {
      expect(ids(sortWatchlist(list, key, 'desc'))).toEqual(['high', 'low', 'new'])
      expect(ids(sortWatchlist(list, key, 'asc'))).toEqual(['low', 'high', 'new'])
    },
  )
  it('does not mutate the input', () => {
    const before = ids(list)
    sortWatchlist(list, 'confidence_score', 'asc')
    expect(ids(list)).toEqual(before)
  })
})

describe('isAwaitingAnalysis', () => {
  it('is true until the first analysis has a date', () => {
    expect(isAwaitingAnalysis({ last_analyzed_at: null })).toBe(true)
    expect(isAwaitingAnalysis({ last_analyzed_at: '2026-03-01' })).toBe(false)
  })
})
