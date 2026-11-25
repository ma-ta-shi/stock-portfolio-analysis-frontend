import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'

// `.env` sets VITE_USE_MOCK=true for local dev; a write needs real mode (hoisted: runs before `@/lib/api` reads the flag).
vi.hoisted(() => {
  vi.stubEnv('VITE_USE_MOCK', 'false')
})

import { useLedgerPreview, useLedgerRecord } from '@/hooks/use-portfolio'
import { usePortfolioId } from '@/hooks/use-portfolio-id'
import { ApiError } from '@/lib/api'
import { LEDGER, ledgerRoute } from '@/lib/ledger-routes'
import { queryKeys } from '@/lib/query-keys'

vi.mock('@/context/UserContext', () => ({ useUser: () => ({ userId: 'u1', setUserId: vi.fn() }) }))

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const fetchMock = vi.fn<typeof fetch>()
let portfolios: unknown[]

beforeEach(() => {
  portfolios = [{ portfolio_id: 'p1', kind: 'user', name: 'Mine', user_id: 'u1' }]
  fetchMock.mockImplementation(async (input) => {
    const url = String(input)
    if (url.startsWith('/api/portfolios?')) return json({ data: portfolios, meta: { total: portfolios.length, page: 1, per_page: 20, pages: 1 } })
    return json({ transactions: [] }, 201)
  })
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
})

function setup<T>(use: () => T) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
  const wrapper = ({ children }: { children: React.ReactNode }) => createElement(QueryClientProvider, { client: queryClient }, children)
  const hook = renderHook(() => ({ owner: usePortfolioId(), ledger: use() }), { wrapper })
  return { ...hook, invalidate }
}

const writes = () => fetchMock.mock.calls.filter(([url]) => !String(url).startsWith('/api/portfolios?'))

describe('useLedgerPreview', () => {
  it('posts the body to the preview route of the owner portfolio, and refreshes nothing', async () => {
    const { result, invalidate } = setup(() => useLedgerPreview(LEDGER.eventsPreview))
    await waitFor(() => expect(result.current.owner.portfolioId).toBe('p1'))
    const body = { events: [{ transaction_type: 'buy' }] }
    await act(async () => {
      await result.current.ledger.mutateAsync({ body })
    })
    const [url, init] = writes()[0]
    expect(url).toBe('/api/portfolios/p1/events/preview')
    expect(init?.method).toBe('POST')
    expect(JSON.parse(String(init?.body))).toEqual(body)
    expect(invalidate).not.toHaveBeenCalled()
  })
})

describe('useLedgerRecord', () => {
  it('posts the body and, once the server confirms, refreshes every portfolio query', async () => {
    const { result, invalidate } = setup(() => useLedgerRecord(LEDGER.events))
    await waitFor(() => expect(result.current.owner.portfolioId).toBe('p1'))
    await act(async () => {
      await result.current.ledger.mutateAsync({ body: { events: [] } })
    })
    expect(writes()[0][0]).toBe('/api/portfolios/p1/events')
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.portfolio.all })
  })

  it('fills the route parameters', async () => {
    const { result } = setup(() => useLedgerRecord(ledgerRoute('POST', '/holdings/{id}/remove')))
    await waitFor(() => expect(result.current.owner.portfolioId).toBe('p1'))
    await act(async () => {
      await result.current.ledger.mutateAsync({ params: { id: 'h 1' } })
    })
    const [url, init] = writes()[0]
    expect(url).toBe('/api/portfolios/p1/holdings/h%201/remove')
    expect(init?.body).toBeUndefined()
  })

  it('keeps the backend code on a failure and refreshes nothing', async () => {
    fetchMock.mockImplementation(async (input) =>
      String(input).startsWith('/api/portfolios?')
        ? json({ data: portfolios, meta: { total: 1, page: 1, per_page: 20, pages: 1 } })
        : json({ error: { code: 'DUPLICATE_ENTRY', message: 'dup', details: {} } }, 409),
    )
    const { result, invalidate } = setup(() => useLedgerRecord(LEDGER.events))
    await waitFor(() => expect(result.current.owner.portfolioId).toBe('p1'))
    await act(async () => {
      await result.current.ledger.mutateAsync({ body: { events: [] } }).catch(() => undefined)
    })
    await waitFor(() => expect(result.current.ledger.error).toBeInstanceOf(ApiError))
    expect((result.current.ledger.error as ApiError).code).toBe('DUPLICATE_ENTRY')
    expect(invalidate).not.toHaveBeenCalled()
  })

  it('refuses to write when the user has no portfolio', async () => {
    portfolios = []
    const { result } = setup(() => useLedgerRecord(LEDGER.events))
    await waitFor(() => expect(result.current.owner.isEmpty).toBe(true))
    await act(async () => {
      await result.current.ledger.mutateAsync({ body: {} }).catch(() => undefined)
    })
    await waitFor(() => expect(result.current.ledger.error?.message).toBe('No portfolio to write to'))
    expect(writes()).toHaveLength(0)
  })
})
