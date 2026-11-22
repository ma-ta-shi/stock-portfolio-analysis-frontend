import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { StockPage } from './StockPage'

vi.mock('@/hooks/use-stock-detail')
vi.mock('@/hooks/use-portfolio')
vi.mock('@/hooks/use-ticker-search')
vi.mock('@/hooks/use-watchlist')
vi.mock('@/hooks/use-user-profile', () => ({
  useUserProfile: () => ({ data: undefined, isLoading: false, isError: false }),
}))
vi.mock('@/hooks/use-fx-rates', () => ({
  useFxRates: () => ({ rates: { CAD: 1, USD: 1.4 }, isLoading: false }),
}))
vi.mock('@/context/UserContext', () => ({
  UserProvider: ({ children }: { children: React.ReactNode }) => children,
  useUser: () => ({ userId: 'user_01', setUserId: vi.fn() }),
}))

import { useStockDetail, useStockAnalysisHistory } from '@/hooks/use-stock-detail'
import { usePortfolioHoldings, useAddToPortfolio, useBuyShares, useSellPosition, useUpdatePosition, useLogDividend } from '@/hooks/use-portfolio'
import { useTickerSearch } from '@/hooks/use-ticker-search'
import { useAddToWatchlist, useWatchlist } from '@/hooks/use-watchlist'

const mockUseStockDetail = vi.mocked(useStockDetail)
const mockUseStockAnalysisHistory = vi.mocked(useStockAnalysisHistory)
const mockUsePortfolioHoldings = vi.mocked(usePortfolioHoldings)
vi.mocked(useAddToPortfolio).mockReturnValue({ mutateAsync: vi.fn(), isPending: false, reset: vi.fn() } as unknown as ReturnType<typeof useAddToPortfolio>)
vi.mocked(useBuyShares).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as unknown as ReturnType<typeof useBuyShares>)
vi.mocked(useSellPosition).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as unknown as ReturnType<typeof useSellPosition>)
vi.mocked(useUpdatePosition).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as unknown as ReturnType<typeof useUpdatePosition>)
vi.mocked(useLogDividend).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as unknown as ReturnType<typeof useLogDividend>)
vi.mocked(useTickerSearch).mockReturnValue({ mutateAsync: vi.fn(), isPending: false, reset: vi.fn() } as unknown as ReturnType<typeof useTickerSearch>)
vi.mocked(useAddToWatchlist).mockReturnValue({ mutateAsync: vi.fn(), isPending: false, reset: vi.fn() } as unknown as ReturnType<typeof useAddToWatchlist>)
vi.mocked(useWatchlist).mockReturnValue({ data: undefined } as unknown as ReturnType<typeof useWatchlist>)

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

describe('StockPage — not yet priced or analysed', () => {
  it('shows "Price not available yet" and "Awaiting analysis" instead of zeros', () => {
    mockUseStockDetail.mockReturnValue({
      data: {
        ...mockStock,
        current_price: null,
        day_change: null,
        day_change_pct: null,
        week_52_high: null,
        week_52_low: null,
        market_cap_cad: null,
        latest_analysis: undefined,
        price_history_90d: [100, 101],
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useStockDetail>)
    mockUseStockAnalysisHistory.mockReturnValue({ data: { data: [] }, isLoading: false } as unknown as ReturnType<typeof useStockAnalysisHistory>)
    mockUsePortfolioHoldings.mockReturnValue({ data: [], isLoading: false } as unknown as ReturnType<typeof usePortfolioHoldings>)

    renderStockPage()

    expect(screen.getByText('Price not available yet')).toBeInTheDocument()
    expect(screen.getByText(/Awaiting analysis\./)).toBeInTheDocument()
    expect(screen.queryByText(/Mkt cap/)).not.toBeInTheDocument()
    expect(screen.queryByText(/today$/)).not.toBeInTheDocument()
    expect(screen.queryByText(/\$0\.00|0\.00%/)).not.toBeInTheDocument()
  })
})

describe('StockPage — awaiting-analysis note', () => {
  const unanalysed = { ...mockStock, latest_analysis: undefined }
  function setup(history: unknown) {
    mockUseStockDetail.mockReturnValue({ data: unanalysed, isLoading: false, isError: false, refetch: vi.fn() } as unknown as ReturnType<typeof useStockDetail>)
    mockUseStockAnalysisHistory.mockReturnValue(history as ReturnType<typeof useStockAnalysisHistory>)
    mockUsePortfolioHoldings.mockReturnValue({ data: [], isLoading: false } as unknown as ReturnType<typeof usePortfolioHoldings>)
    renderStockPage()
  }

  it('is not shown when the stock has past analyses', () => {
    setup({
      data: { data: [{ analysis_id: 'a1', stock_outlook: 'bullish', confidence_score: 70, disagreement_score: 0.1, price_at_analysis: 140, account_type: 'tfsa', timeline: 'medium_term', prediction_status: 'active', analyzed_at: '2026-03-01T00:00:00Z' }] },
      isLoading: false,
      isError: false,
    })
    expect(screen.queryByText(/Awaiting analysis\./)).not.toBeInTheDocument()
  })

  it('is not shown while the history is still loading', () => {
    setup({ data: undefined, isLoading: true, isError: false })
    expect(screen.queryByText(/Awaiting analysis\./)).not.toBeInTheDocument()
  })
})
