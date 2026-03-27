import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, useNavigate } from 'react-router-dom'
import { HoldingsTable } from './HoldingsTable'
import { mockHolding } from '@/test/mock-data'

vi.mock('@/hooks/use-portfolio')
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: vi.fn() }
})

import { usePortfolioHoldings } from '@/hooks/use-portfolio'
const mockUsePortfolioHoldings = vi.mocked(usePortfolioHoldings)
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
})
