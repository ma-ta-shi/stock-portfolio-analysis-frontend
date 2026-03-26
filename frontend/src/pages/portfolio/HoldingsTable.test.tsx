import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HoldingsTable } from './HoldingsTable'
import { mockHolding } from '@/test/mock-data'

vi.mock('@/hooks/use-portfolio')
vi.mock('@/hooks/use-analysis')

import { usePortfolioHoldings } from '@/hooks/use-portfolio'
import { useRecentAnalyses } from '@/hooks/use-analysis'
const mockUsePortfolioHoldings = vi.mocked(usePortfolioHoldings)
const mockUseRecentAnalyses = vi.mocked(useRecentAnalyses)

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('HoldingsTable', () => {
  beforeEach(() => {
    mockUseRecentAnalyses.mockReturnValue({
      data: [{ analysis_id: 'run_002', ticker: 'RY.TO' }],
    } as ReturnType<typeof useRecentAnalyses>)
  })

  it('shows loading skeleton while loading', () => {
    mockUsePortfolioHoldings.mockReturnValue({ data: undefined, isLoading: true } as ReturnType<typeof usePortfolioHoldings>)
    const { container } = renderWithRouter(<HoldingsTable />)
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('shows empty state when no holdings', () => {
    mockUsePortfolioHoldings.mockReturnValue({ data: [], isLoading: false } as ReturnType<typeof usePortfolioHoldings>)
    renderWithRouter(<HoldingsTable />)
    expect(screen.getByText('No holdings found.')).toBeInTheDocument()
  })

  it('renders a row for each holding', () => {
    const secondHolding = { ...mockHolding, holding_id: 'h_002', account_type: 'rrsp' }
    mockUsePortfolioHoldings.mockReturnValue({ data: [mockHolding, secondHolding], isLoading: false } as ReturnType<typeof usePortfolioHoldings>)
    renderWithRouter(<HoldingsTable />)
    const rows = screen.getAllByText('RY.TO')
    expect(rows).toHaveLength(2)
  })

  it('renders ticker as a link to the analysis page', () => {
    mockUsePortfolioHoldings.mockReturnValue({ data: [mockHolding], isLoading: false } as ReturnType<typeof usePortfolioHoldings>)
    renderWithRouter(<HoldingsTable />)
    const link = screen.getByRole('link', { name: 'RY.TO' })
    expect(link.getAttribute('href')).toBe('/analysis/run_002')
  })

  it('renders the account type badge', () => {
    mockUsePortfolioHoldings.mockReturnValue({ data: [mockHolding], isLoading: false } as ReturnType<typeof usePortfolioHoldings>)
    renderWithRouter(<HoldingsTable />)
    expect(screen.getByText('TFSA')).toBeInTheDocument()
  })

  it('renders the recommendation badge', () => {
    mockUsePortfolioHoldings.mockReturnValue({ data: [mockHolding], isLoading: false } as ReturnType<typeof usePortfolioHoldings>)
    renderWithRouter(<HoldingsTable />)
    expect(screen.getByText('BUY')).toBeInTheDocument()
  })

  it('renders dividend yield as percentage', () => {
    mockUsePortfolioHoldings.mockReturnValue({ data: [mockHolding], isLoading: false } as ReturnType<typeof usePortfolioHoldings>)
    renderWithRouter(<HoldingsTable />)
    // 0.0394 > 0 → "3.94%"
    expect(screen.getByText('3.94%')).toBeInTheDocument()
  })

  it('shows — for zero dividend yield', () => {
    const noDivHolding = { ...mockHolding, annual_dividend_yield: 0 }
    mockUsePortfolioHoldings.mockReturnValue({ data: [noDivHolding], isLoading: false } as ReturnType<typeof usePortfolioHoldings>)
    renderWithRouter(<HoldingsTable />)
    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBeGreaterThanOrEqual(1)
  })

  it('renders the stock name as subtext', () => {
    mockUsePortfolioHoldings.mockReturnValue({ data: [mockHolding], isLoading: false } as ReturnType<typeof usePortfolioHoldings>)
    renderWithRouter(<HoldingsTable />)
    expect(screen.getByText('Royal Bank of Canada')).toBeInTheDocument()
  })
})
