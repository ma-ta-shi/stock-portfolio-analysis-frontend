import { describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useAddToWatchlist } from './use-watchlist'
import { queryKeys } from '@/lib/query-keys'
import type { WatchlistResponse } from '@/types'

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
