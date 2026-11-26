import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useAddToWatchlist, useRemoveFromWatchlist, useWatchlist } from './use-watchlist'
import { installFixtureFetch } from '@/test/fixture-fetch'

vi.mock('@/context/UserContext', () => ({ useUser: () => ({ userId: 'user_01', setUserId: vi.fn() }) }))

const client = () => new QueryClient({ defaultOptions: { queries: { retry: false } } })
const wrap = (c: QueryClient) => ({ children }: { children: ReactNode }) => <QueryClientProvider client={c}>{children}</QueryClientProvider>

afterEach(() => vi.unstubAllGlobals())

describe('useWatchlist', () => {
  it('reads every watched stock from the recorded response', async () => {
    installFixtureFetch()
    const { result } = renderHook(() => useWatchlist(), { wrapper: wrap(client()) })
    await waitFor(() => expect(result.current.data).toHaveLength(3))
    expect(result.current.data!.map((i) => i.stock.ticker).sort()).toEqual(['MSFT', 'RY.TO', 'TD.TO'])
  })

  it('does not read while disabled', () => {
    const fetch = installFixtureFetch()
    renderHook(() => useWatchlist({ enabled: false }), { wrapper: wrap(client()) })
    expect(fetch).not.toHaveBeenCalled()
  })
})

// Unit tests run in mock mode, where a write has no recorded answer: it must fail visibly and never edit the list.
describe('watchlist writes in mock mode', () => {
  it.each([
    ['add', () => useAddToWatchlist(), 'BNS.TO'],
    ['remove', () => useRemoveFromWatchlist(), 'w1'],
  ])('refuses to %s, without a request', async (_name, hook, input) => {
    const fetch = installFixtureFetch()
    const { result } = renderHook(hook, { wrapper: wrap(client()) })
    await act(async () => {
      await expect(result.current.mutateAsync(input)).rejects.toMatchObject({ code: 'mock_mode_unsupported' })
    })
    expect(fetch).not.toHaveBeenCalled()
  })
})
