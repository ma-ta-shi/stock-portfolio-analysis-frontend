import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { installFixtureFetch } from '@/test/fixture-fetch'
import {
  useAddToPortfolio,
  useBuyShares,
  useClosedPositions,
  useCorrectTransaction,
  useExposure,
  useLogDividend,
  usePortfolioHoldings,
  usePortfolioSummary,
  useRemoveFromPortfolio,
  useReverseTransaction,
  useSellPosition,
  useTransactions,
  useUpdatePosition,
} from '@/hooks/use-portfolio'
import { EMPTY_FILTERS } from '@/lib/transactions'

// Mock UserContext so renderHook doesn't need localStorage
vi.mock('@/context/UserContext', () => ({
  useUser: () => ({ userId: 'user_01', setUserId: vi.fn() }),
}))

// `.env` sets VITE_USE_MOCK=true: the hooks read the recorded API responses in public/mock-data/portfolio.
vi.stubEnv('VITE_USE_MOCK', 'true')

function makeWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

beforeEach(() => {
  installFixtureFetch()
})
afterEach(() => {
  vi.unstubAllGlobals()
})

describe('portfolio reads (recorded API responses)', () => {
  it('lists the active holdings, mapped, with closed ones left out', async () => {
    const { result } = renderHook(() => usePortfolioHoldings(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.data).toBeDefined())
    const tickers = result.current.data!.map((h) => h.stock.ticker)
    expect(tickers).toContain('RY.TO')
    expect(tickers).not.toContain('XOM') // closed
    expect(result.current.data!.every((h) => h.is_active)).toBe(true)
  })

  it('lists the closed positions from the same request', async () => {
    const { result } = renderHook(() => useClosedPositions(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.data).toBeDefined())
    expect(result.current.data!.map((h) => h.stock.ticker).sort()).toEqual(['KO', 'PLUG', 'XOM'])
  })

  it('builds the header from positions, report, history, accounts and room', async () => {
    const { result } = renderHook(() => usePortfolioSummary('combined'), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.data).toBeDefined())
    const summary = result.current.data!
    expect(summary.view).toBe('combined')
    expect(summary.total_value_cad).toBeGreaterThan(0)
    expect(summary.unavailable).toEqual({ report: false, history: false, accounts: false, room: false })
  })

  it('reads the exposure report', async () => {
    const { result } = renderHook(() => useExposure(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.data).toBeDefined())
    expect(result.current.data!.total_value_cad).toBeGreaterThan(0)
  })

  it('maps a page of the ledger', async () => {
    const { result } = renderHook(() => useTransactions(EMPTY_FILTERS, 'combined', 1), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.data).toBeDefined())
    expect(result.current.data!.rows.length).toBeGreaterThan(0)
    expect(result.current.data!.meta.page).toBe(1)
  })
})

describe('writes that are not connected yet', () => {
  const stubs = [
    ['useAddToPortfolio', useAddToPortfolio, {}, 'P-W6'],
    ['useBuyShares', useBuyShares, {}, 'P-W1'],
    ['useSellPosition', useSellPosition, {}, 'P-W2'],
    ['useLogDividend', useLogDividend, {}, 'P-W3'],
    ['useUpdatePosition', useUpdatePosition, {}, 'P-W4'],
    ['useRemoveFromPortfolio', useRemoveFromPortfolio, 'h1', 'P-W5'],
    ['useCorrectTransaction', useCorrectTransaction, 't1', 'P-W7'],
    ['useReverseTransaction', useReverseTransaction, 't1', 'P-W8'],
  ] as const

  it.each(stubs)('%s raises an error naming gap %s', async (_name, useHook, input, gap) => {
    const { result } = renderHook(() => (useHook as () => { mutateAsync: (v: unknown) => Promise<unknown> })(), { wrapper: makeWrapper() })
    let message = ''
    await act(async () => {
      await result.current.mutateAsync(input).catch((e: Error) => {
        message = e.message
      })
    })
    expect(message).toContain(gap)
  })
})
