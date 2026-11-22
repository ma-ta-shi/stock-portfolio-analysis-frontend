import { describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useAddToWatchlist, useRemoveFromWatchlist } from './use-watchlist'
import { queryKeys } from '@/lib/query-keys'
import type { WatchlistItem, WatchlistResponse } from '@/types'

vi.mock('@/context/UserContext', () => ({ useUser: () => ({ userId: 'user_01', setUserId: vi.fn() }) }))

describe('useAddToWatchlist (mock mode)', () => {
  it('adds the stock as awaiting analysis — nulls, not placeholder values', async () => {
    const client = new QueryClient()
    const seed: WatchlistResponse = { data: [], summary: { total: 0, bullish_count: 0, changed_since_last_check: 0 } }
    client.setQueryData(queryKeys.watchlist('user_01'), seed)
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
    const { result } = renderHook(() => useAddToWatchlist(), { wrapper })

    await act(() =>
      result.current.mutateAsync({ stock_id: 'stk_ry_to', ticker: 'RY.TO', name: 'Royal Bank', sector: 'Financials', exchange: 'TSX', currency: 'CAD' }),
    )
    await waitFor(() => expect(client.getQueryData<WatchlistResponse>(queryKeys.watchlist('user_01'))?.data).toHaveLength(1))
    const added = client.getQueryData<WatchlistResponse>(queryKeys.watchlist('user_01'))!.data[0]
    expect(added).toMatchObject({
      current_price: null,
      day_change_pct: null,
      stock_outlook: null,
      confidence_score: null,
      projected_return_pct: null,
      portfolio_fit: null,
      suggested_account: null,
      last_analyzed_at: null,
    })
  })
})

function setup(seed: WatchlistResponse) {
  const client = new QueryClient()
  client.setQueryData(queryKeys.watchlist('user_01'), seed)
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  const summary = () => client.getQueryData<WatchlistResponse>(queryKeys.watchlist('user_01'))!.summary
  return { client, wrapper, summary }
}

const wl = (id: string, outlook: WatchlistItem['stock_outlook']) =>
  ({ watchlist_id: id, stock: { stock_id: `stk_${id}` }, stock_outlook: outlook }) as WatchlistItem

describe('watchlist summary after local changes', () => {
  // The backend's counts stay authoritative: they're adjusted, not recomputed. The
  // summary covers the whole watchlist, but `data` may be one page of it (the API is
  // paginated), so recounting from the loaded rows would be wrong.
  const seed: WatchlistResponse = {
    data: [wl('a', 'bullish'), wl('b', 'somewhat_bullish'), wl('c', 'neutral')],
    summary: { total: 10, bullish_count: 7, changed_since_last_check: 1 },
  }

  it('adding an unanalysed stock increases the total but not the bullish count', async () => {
    const { wrapper, summary } = setup(seed)
    const { result } = renderHook(() => useAddToWatchlist(), { wrapper })
    await act(() => result.current.mutateAsync({ stock_id: 'stk_new', ticker: 'NEW', name: 'New', sector: 'X', exchange: 'TSX', currency: 'CAD' }))
    await waitFor(() => expect(summary().total).toBe(11))
    expect(summary()).toEqual({ total: 11, bullish_count: 7, changed_since_last_check: 1 })
  })

  it.each([
    ['a', 'bullish', 6],
    ['b', 'somewhat_bullish', 6],
    ['c', 'neutral', 7],
  ])('removing %s (%s) leaves bullish_count %i', async (id, _outlook, expected) => {
    const { wrapper, summary } = setup(seed)
    const { result } = renderHook(() => useRemoveFromWatchlist(), { wrapper })
    await act(() => result.current.mutateAsync(id))
    await waitFor(() => expect(summary().total).toBe(9))
    expect(summary().bullish_count).toBe(expected)
  })
})
