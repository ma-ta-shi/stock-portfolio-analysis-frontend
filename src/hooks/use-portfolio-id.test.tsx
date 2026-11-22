import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { usePortfolioId } from './use-portfolio-id'
import { apiFetch } from '@/lib/api'

vi.mock('@/context/UserContext', () => ({ useUser: () => ({ userId: 'u1', setUserId: vi.fn() }) }))
vi.mock('@/lib/api', () => ({ apiFetch: vi.fn() }))

// One client per test, created outside the wrapper (a client made inside it is replaced on every render).
let client: QueryClient
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

const listOf = (data: object[]) => ({ data, meta: { total: data.length, page: 1, per_page: 20, pages: 1 } })

describe('usePortfolioId', () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockReset()
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  })

  it("returns the owner's portfolio, not the agent's", async () => {
    vi.mocked(apiFetch).mockResolvedValue(
      listOf([
        { portfolio_id: 'agent-1', kind: 'agent' },
        { portfolio_id: 'mine', kind: 'user' },
      ]),
    )
    const { result } = renderHook(() => usePortfolioId(), { wrapper })
    await waitFor(() => expect(result.current.portfolioId).toBe('mine'))
    expect(result.current.isEmpty).toBe(false)
    expect(vi.mocked(apiFetch).mock.calls[0][1]).toBe('/api/portfolios?user_id=u1')
  })

  it('is empty once the lookup finds no owner portfolio', async () => {
    vi.mocked(apiFetch).mockResolvedValue(listOf([{ portfolio_id: 'agent-1', kind: 'agent' }]))
    const { result } = renderHook(() => usePortfolioId(), { wrapper })
    await waitFor(() => expect(result.current.isEmpty).toBe(true))
    expect(result.current.portfolioId).toBeNull()
  })

  it('is not empty while loading or after an error', async () => {
    vi.mocked(apiFetch).mockRejectedValue(new Error('down'))
    const { result } = renderHook(() => usePortfolioId(), { wrapper })
    expect(result.current.isEmpty).toBe(false)
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.isEmpty).toBe(false)
  })
})
