import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { StockPage } from './StockPage'

vi.mock('@/hooks/use-stock-detail')
vi.mock('@/hooks/use-portfolio')
vi.mock('@/hooks/use-ticker-search')
vi.mock('@/hooks/use-watchlist')
vi.mock('@/context/UserContext', () => ({
  UserProvider: ({ children }: { children: React.ReactNode }) => children,
  useUser: () => ({ userId: 'user_01', setUserId: vi.fn() }),
}))

import { useStockDetail, useStockAnalysisHistory } from '@/hooks/use-stock-detail'
import { usePortfolioHoldings, useAddToPortfolio, useBuyShares, useSellPosition, useUpdatePosition } from '@/hooks/use-portfolio'
import { useTickerSearch } from '@/hooks/use-ticker-search'
import { useAddToWatchlist } from '@/hooks/use-watchlist'

const mockUseStockDetail = vi.mocked(useStockDetail)
const mockUseStockAnalysisHistory = vi.mocked(useStockAnalysisHistory)
const mockUsePortfolioHoldings = vi.mocked(usePortfolioHoldings)
vi.mocked(useAddToPortfolio).mockReturnValue({ mutateAsync: vi.fn(), isPending: false, reset: vi.fn() } as unknown as ReturnType<typeof useAddToPortfolio>)
vi.mocked(useBuyShares).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as unknown as ReturnType<typeof useBuyShares>)
vi.mocked(useSellPosition).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as unknown as ReturnType<typeof useSellPosition>)
vi.mocked(useUpdatePosition).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as unknown as ReturnType<typeof useUpdatePosition>)
vi.mocked(useTickerSearch).mockReturnValue({ mutateAsync: vi.fn(), isPending: false, reset: vi.fn() } as unknown as ReturnType<typeof useTickerSearch>)
vi.mocked(useAddToWatchlist).mockReturnValue({ mutateAsync: vi.fn(), isPending: false, reset: vi.fn() } as unknown as ReturnType<typeof useAddToWatchlist>)

const mockStock = {
  stock_id: 'stk_ry_to',
  ticker: 'RY.TO',
  name: 'Royal Bank of Canada',
  exchange: 'TSX',
  currency: 'CAD',
  sector: 'Financials',
  current_price: 145.0,
  day_change: 1.0,
  day_change_pct: 0.007,
  week_52_high: 160.0,
  week_52_low: 120.0,
  market_cap_cad: 200_000_000_000,
  volume: 1_000_000,
  latest_analysis_id: 'run_001',
  latest_outlook: 'somewhat_bullish' as const,
  latest_outlook_summary: 'Solid fundamentals.',
  layer2_context: null,
  stock_fundamentals: null,
}

function renderStockPage(stockId = 'stk_ry_to') {
  return render(
    <MemoryRouter initialEntries={[`/stocks/${stockId}`]}>
      <Routes>
        <Route path="/stocks/:stockId" element={<StockPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('StockPage — Run New Analysis button', () => {
  it('renders a disabled button instead of a broken link to /analysis/new', () => {
    mockUseStockDetail.mockReturnValue({
      data: mockStock,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useStockDetail>)
    mockUseStockAnalysisHistory.mockReturnValue({
      data: { data: [] },
      isLoading: false,
    } as unknown as ReturnType<typeof useStockAnalysisHistory>)
    mockUsePortfolioHoldings.mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof usePortfolioHoldings>)

    renderStockPage()

    const btn = screen.getByRole('button', { name: /run new analysis/i })
    expect(btn).toBeDisabled()
    // Ensure it is not wrapped in a link
    expect(btn.closest('a')).toBeNull()
  })
})

describe('StockPage — error state', () => {
  it('shows retry button when stock fetch fails', () => {
    mockUseStockDetail.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useStockDetail>)
    mockUseStockAnalysisHistory.mockReturnValue({
      data: undefined,
      isLoading: false,
    } as unknown as ReturnType<typeof useStockAnalysisHistory>)
    mockUsePortfolioHoldings.mockReturnValue({
      data: undefined,
      isLoading: false,
    } as unknown as ReturnType<typeof usePortfolioHoldings>)

    renderStockPage()

    expect(screen.getByText(/failed to load stock data/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('shows not-found message when stock is missing (no error)', () => {
    mockUseStockDetail.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useStockDetail>)
    mockUseStockAnalysisHistory.mockReturnValue({
      data: undefined,
      isLoading: false,
    } as unknown as ReturnType<typeof useStockAnalysisHistory>)
    mockUsePortfolioHoldings.mockReturnValue({
      data: undefined,
      isLoading: false,
    } as unknown as ReturnType<typeof usePortfolioHoldings>)

    renderStockPage()

    expect(screen.getByText(/stock not found/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /retry/i })).toBeNull()
  })
})
