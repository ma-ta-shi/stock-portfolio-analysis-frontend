import { describe, it, expect, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { mockHolding } from '@/test/mock-data'
import type { Holding } from '@/types'

// Mock UserContext so renderHook doesn't need localStorage
vi.mock('@/context/UserContext', () => ({
  useUser: () => ({ userId: 'user_01', setUserId: vi.fn() }),
}))

// Ensure mock mode so no real fetches happen
vi.stubEnv('VITE_USE_MOCK', 'true')

const USER_ID = 'user_01'
const CACHE_KEY = ['portfolio', 'holdings', USER_ID]

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

function makeQC() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function seedCache(queryClient: QueryClient, holdings: Holding[]) {
  queryClient.setQueryData<Holding[]>(CACHE_KEY, holdings)
}

describe('useAddToPortfolio', () => {
  it('appends the new holding to the cache', async () => {
    const queryClient = makeQC()
    seedCache(queryClient, [mockHolding])

    const { useAddToPortfolio } = await import('@/hooks/use-portfolio')
    const { result } = renderHook(() => useAddToPortfolio(), {
      wrapper: makeWrapper(queryClient),
    })

    await act(async () => {
      await result.current.mutateAsync({
        stock: {
          ticker: 'SHOP.TO', name: 'Shopify Inc.', exchange: 'TSX',
          sector: 'Technology', currency: 'CAD', stock_id: 'stk_shop_to',
        },
        shares: 10,
        average_cost_basis: 100,
        account_type: 'tfsa',
      })
    })

    const cached = queryClient.getQueryData<Holding[]>(CACHE_KEY)
    expect(cached).toHaveLength(2)
    expect(cached?.[1].stock.ticker).toBe('SHOP.TO')
    expect(cached?.[1].shares).toBe(10)
    expect(cached?.[1].stock_outlook).toBe('neutral')
  })

  it('initialises cache when it was empty', async () => {
    const queryClient = makeQC()

    const { useAddToPortfolio } = await import('@/hooks/use-portfolio')
    const { result } = renderHook(() => useAddToPortfolio(), {
      wrapper: makeWrapper(queryClient),
    })

    await act(async () => {
      await result.current.mutateAsync({
        stock: {
          ticker: 'RY.TO', name: 'Royal Bank', exchange: 'TSX',
          sector: 'Financials', currency: 'CAD', stock_id: 'stk_ry_to',
        },
        shares: 5,
        average_cost_basis: 130,
        account_type: 'rrsp',
      })
    })

    const cached = queryClient.getQueryData<Holding[]>(CACHE_KEY)
    expect(cached).toHaveLength(1)
  })
})

describe('useRemoveFromPortfolio', () => {
  it('removes the holding with the matching id from cache', async () => {
    const queryClient = makeQC()
    const second = { ...mockHolding, holding_id: 'h_002' }
    seedCache(queryClient, [mockHolding, second])

    const { useRemoveFromPortfolio } = await import('@/hooks/use-portfolio')
    const { result } = renderHook(() => useRemoveFromPortfolio(), {
      wrapper: makeWrapper(queryClient),
    })

    await act(async () => {
      await result.current.mutateAsync(mockHolding.holding_id)
    })

    const cached = queryClient.getQueryData<Holding[]>(CACHE_KEY)
    expect(cached).toHaveLength(1)
    expect(cached?.[0].holding_id).toBe('h_002')
  })

  it('leaves cache unchanged when id not found', async () => {
    const queryClient = makeQC()
    seedCache(queryClient, [mockHolding])

    const { useRemoveFromPortfolio } = await import('@/hooks/use-portfolio')
    const { result } = renderHook(() => useRemoveFromPortfolio(), {
      wrapper: makeWrapper(queryClient),
    })

    await act(async () => {
      await result.current.mutateAsync('does_not_exist')
    })

    const cached = queryClient.getQueryData<Holding[]>(CACHE_KEY)
    expect(cached).toHaveLength(1)
  })
})

describe('useUpdatePosition', () => {
  it('updates shares and recalculates derived fields', async () => {
    const queryClient = makeQC()
    seedCache(queryClient, [mockHolding])

    const { useUpdatePosition } = await import('@/hooks/use-portfolio')
    const { result } = renderHook(() => useUpdatePosition(), {
      wrapper: makeWrapper(queryClient),
    })

    await act(async () => {
      await result.current.mutateAsync({
        holdingId: mockHolding.holding_id,
        shares: 100,
        average_cost_basis: 120,
      })
    })

    const cached = queryClient.getQueryData<Holding[]>(CACHE_KEY)
    const updated = cached?.[0]
    expect(updated?.shares).toBe(100)
    expect(updated?.average_cost_basis).toBe(120)
    // market_value = 100 * current_price(145) = 14500
    expect(updated?.market_value).toBe(14500)
    // book_cost = 100 * 120 = 12000; gain = 14500 - 12000 = 2500
    expect(updated?.total_gain_loss).toBe(2500)
    expect(updated?.total_gain_loss_pct).toBeCloseTo(2500 / 12000)
    // yield_on_cost = annual_div_per_share / avg_cost = 5.72 / 120
    expect(updated?.yield_on_cost).toBeCloseTo(5.72 / 120)
  })

  it('does not mutate other holdings in cache', async () => {
    const queryClient = makeQC()
    const second = { ...mockHolding, holding_id: 'h_002' }
    seedCache(queryClient, [mockHolding, second])

    const { useUpdatePosition } = await import('@/hooks/use-portfolio')
    const { result } = renderHook(() => useUpdatePosition(), {
      wrapper: makeWrapper(queryClient),
    })

    await act(async () => {
      await result.current.mutateAsync({
        holdingId: mockHolding.holding_id,
        shares: 1,
        average_cost_basis: 1,
      })
    })

    const cached = queryClient.getQueryData<Holding[]>(CACHE_KEY)
    expect(cached?.[1]).toEqual(second)
  })
})

describe('usePortfolioHoldings', () => {
  it('exposes Holding[] directly from cache (not a wrapper object)', async () => {
    const queryClient = makeQC()
    seedCache(queryClient, [mockHolding])

    const { usePortfolioHoldings } = await import('@/hooks/use-portfolio')
    const { result } = renderHook(() => usePortfolioHoldings(), {
      wrapper: makeWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.data).toBeDefined())
    expect(Array.isArray(result.current.data)).toBe(true)
    expect(result.current.data?.[0].holding_id).toBe(mockHolding.holding_id)
  })
})
