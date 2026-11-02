import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, useNavigate } from 'react-router-dom'
import { HoldingsTable } from './HoldingsTable'
import { mockHolding, mockUsdHolding } from '@/test/mock-data'
import { ApiError } from '@/lib/api'

vi.mock('@/hooks/use-portfolio')
vi.mock('@/hooks/use-user-profile', () => ({
  useUserProfile: () => ({ data: undefined, isLoading: false, isError: false }),
}))
vi.mock('@/hooks/use-fx-rates', () => ({
  useFxRates: () => ({ rates: { CAD: 1, USD: 1.4 }, isLoading: false }),
}))
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: vi.fn() }
})

import { usePortfolioHoldings, useRemoveFromPortfolio, useUpdatePosition, useClosedPositions, useSellPosition, useBuyShares } from '@/hooks/use-portfolio'
const mockUsePortfolioHoldings = vi.mocked(usePortfolioHoldings)
vi.mocked(useRemoveFromPortfolio).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as unknown as ReturnType<typeof useRemoveFromPortfolio>)
vi.mocked(useUpdatePosition).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as unknown as ReturnType<typeof useUpdatePosition>)
vi.mocked(useClosedPositions).mockReturnValue({ data: [] } as unknown as ReturnType<typeof useClosedPositions>)
vi.mocked(useSellPosition).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as unknown as ReturnType<typeof useSellPosition>)
vi.mocked(useBuyShares).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as unknown as ReturnType<typeof useBuyShares>)
const mockNavigate = vi.fn()
vi.mocked(useNavigate).mockReturnValue(mockNavigate)

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('HoldingsTable', () => {

  it('shows loading skeleton while loading', () => {
    mockUsePortfolioHoldings.mockReturnValue({ data: undefined, isLoading: true } as unknown as ReturnType<typeof usePortfolioHoldings>)
    const { container } = renderWithRouter(<HoldingsTable />)
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('shows empty state when no holdings', () => {
    mockUsePortfolioHoldings.mockReturnValue({ data: [], isLoading: false } as unknown as ReturnType<typeof usePortfolioHoldings>)
    renderWithRouter(<HoldingsTable />)
    expect(screen.getByText('No holdings found.')).toBeInTheDocument()
  })

  it('renders a row for each holding', () => {
    const secondHolding = { ...mockHolding, holding_id: 'h_002', account_type: 'rrsp' }
    mockUsePortfolioHoldings.mockReturnValue({ data: [mockHolding, secondHolding], isLoading: false } as unknown as ReturnType<typeof usePortfolioHoldings>)
    renderWithRouter(<HoldingsTable />)
    const rows = screen.getAllByText('RY.TO')
    expect(rows).toHaveLength(2)
  })

  it('navigates to stock page on row click', () => {
    mockUsePortfolioHoldings.mockReturnValue({ data: [mockHolding], isLoading: false } as unknown as ReturnType<typeof usePortfolioHoldings>)
    renderWithRouter(<HoldingsTable />)
    fireEvent.click(screen.getByText('RY.TO'))
    expect(mockNavigate).toHaveBeenCalledWith('/stocks/stk_ry_to')
  })

  it('renders the account type badge', () => {
    mockUsePortfolioHoldings.mockReturnValue({ data: [mockHolding], isLoading: false } as unknown as ReturnType<typeof usePortfolioHoldings>)
    renderWithRouter(<HoldingsTable />)
    expect(screen.getByText('TFSA')).toBeInTheDocument()
  })

  it('renders the outlook badge', () => {
    mockUsePortfolioHoldings.mockReturnValue({ data: [mockHolding], isLoading: false } as unknown as ReturnType<typeof usePortfolioHoldings>)
    renderWithRouter(<HoldingsTable />)
    expect(screen.getByText('Somewhat Bullish')).toBeInTheDocument()
  })

  it('renders dividend yield as percentage', () => {
    mockUsePortfolioHoldings.mockReturnValue({ data: [mockHolding], isLoading: false } as unknown as ReturnType<typeof usePortfolioHoldings>)
    renderWithRouter(<HoldingsTable />)
    // 0.0394 > 0 → "3.94%"
    expect(screen.getByText('3.94%')).toBeInTheDocument()
  })

  it('shows — for zero dividend yield', () => {
    const noDivHolding = { ...mockHolding, annual_dividend_yield: 0 }
    mockUsePortfolioHoldings.mockReturnValue({ data: [noDivHolding], isLoading: false } as unknown as ReturnType<typeof usePortfolioHoldings>)
    renderWithRouter(<HoldingsTable />)
    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBeGreaterThanOrEqual(1)
  })

  it('renders the stock name as subtext', () => {
    mockUsePortfolioHoldings.mockReturnValue({ data: [mockHolding], isLoading: false } as unknown as ReturnType<typeof usePortfolioHoldings>)
    renderWithRouter(<HoldingsTable />)
    expect(screen.getByText('Royal Bank of Canada')).toBeInTheDocument()
  })

  it('formats a USD holding in USD, not CAD', () => {
    mockUsePortfolioHoldings.mockReturnValue({ data: [mockUsdHolding], isLoading: false } as unknown as ReturnType<typeof usePortfolioHoldings>)
    renderWithRouter(<HoldingsTable />)
    expect(screen.getByText('US$9,968.75')).toBeInTheDocument()
    expect(screen.getByText('+US$2,158.75')).toBeInTheDocument()
    expect(screen.getByText('+27.65%')).toBeInTheDocument()
  })

  it('navigates with the keyboard (Enter on a focused row)', () => {
    mockNavigate.mockClear()
    mockUsePortfolioHoldings.mockReturnValue({ data: [mockHolding], isLoading: false } as unknown as ReturnType<typeof usePortfolioHoldings>)
    renderWithRouter(<HoldingsTable />)
    const row = screen.getByRole('row', { name: 'View RY.TO' })
    expect(row).toHaveAttribute('tabindex', '0')
    fireEvent.keyDown(row, { key: 'Enter' })
    expect(mockNavigate).toHaveBeenCalledWith('/stocks/stk_ry_to')
  })

  it('gives icon-only action buttons accessible names, and they do not navigate', () => {
    mockNavigate.mockClear()
    mockUsePortfolioHoldings.mockReturnValue({ data: [mockHolding], isLoading: false } as unknown as ReturnType<typeof usePortfolioHoldings>)
    renderWithRouter(<HoldingsTable />)
    expect(screen.getByRole('button', { name: 'Buy more RY.TO (TFSA)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit RY.TO (TFSA)' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Sell RY.TO (TFSA)' }))
    expect(mockNavigate).not.toHaveBeenCalled()
    // The sell dialog opened instead
    expect(screen.getByRole('dialog')).toHaveTextContent('Sell RY.TO')
  })

  it('shows an error with retry when holdings fail to load', () => {
    const refetch = vi.fn()
    mockUsePortfolioHoldings.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new ApiError('x', null, 'network_error', '/api/portfolio/user_01'),
      refetch,
    } as unknown as ReturnType<typeof usePortfolioHoldings>)
    renderWithRouter(<HoldingsTable />)
    expect(screen.getByRole('alert')).toHaveTextContent('Failed to load holdings.')
    expect(screen.getByRole('alert')).toHaveTextContent('Could not reach the server.')
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(refetch).toHaveBeenCalled()
  })
})
