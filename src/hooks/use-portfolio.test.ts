import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { installFixtureFetch } from '@/test/fixture-fetch'
import {
  useClosedPositions,
  useDividends,
  useExposure,
  usePortfolioHoldings,
  usePortfolioSummary,
  useTransactions,
} from '@/hooks/use-portfolio'
import { EMPTY_FILTERS } from '@/lib/transactions'

// Mock UserContext so renderHook doesn't need localStorage
vi.mock('@/context/UserContext', () => ({
  useUser: () => ({ userId: 'u1', setUserId: vi.fn() }),
}))

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
    expect(tickers).not.toContain('TRP.TO') // closed
    expect(result.current.data!.every((h) => h.is_active)).toBe(true)
  })

  it('lists the closed positions from the same request', async () => {
    const { result } = renderHook(() => useClosedPositions(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.data).toBeDefined())
    expect(result.current.data!.map((h) => h.stock.ticker).sort()).toEqual(['AQN.TO', 'POW.TO', 'TRP.TO'])
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

describe('dividends and broker checks (recorded API responses)', () => {
  it('lists every dividend the system found, with the withholding rate as a fraction', async () => {
    const { result } = renderHook(() => useDividends(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.data).toBeDefined())
    expect(result.current.data!.length).toBeGreaterThan(0)
    expect(result.current.data!.every((e) => e.withholding_rate != null && e.withholding_rate_pct / 100 === e.withholding_rate)).toBe(true)
    expect(result.current.data!.map((e) => e.status)).toContain('expected')
  })
})
