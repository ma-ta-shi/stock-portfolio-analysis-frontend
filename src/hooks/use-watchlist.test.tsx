import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useAddToWatchlist, useRemoveFromWatchlist, useWatchlist } from './use-watchlist'
import { installFixtureFetch } from '@/test/fixture-fetch'

vi.mock('@/context/UserContext', () => ({ useUser: () => ({ userId: 'u1', setUserId: vi.fn() }) }))

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

// A write has no recording, so the stand-in server refuses it: the failure reaches the caller and nothing is edited.
describe('a refused watchlist write', () => {
  it.each([
    ['add', () => useAddToWatchlist(), 'BNS.TO', 'POST', '/api/watchlist'],
    ['remove', () => useRemoveFromWatchlist(), 'w1', 'DELETE', '/api/watchlist/w1'],
  ])('to %s says why and leaves the list as it was read', async (_name, hook, input, method, url) => {
    const fetch = installFixtureFetch()
    const c = client()
    const list = renderHook(() => useWatchlist(), { wrapper: wrap(c) })
    await waitFor(() => expect(list.result.current.data).toHaveLength(3))
    const { result } = renderHook(hook, { wrapper: wrap(c) })
    await act(async () => {
      await expect(result.current.mutateAsync(input)).rejects.toMatchObject({ code: 'not_found', status: 404 })
    })
    expect(fetch).toHaveBeenCalledWith(url, expect.objectContaining({ method }))
    expect(list.result.current.data).toHaveLength(3)
  })
})
