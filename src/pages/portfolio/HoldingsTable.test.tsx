import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { MemoryRouter, useNavigate } from 'react-router-dom'
import { HoldingsTable } from './HoldingsTable'
import { fixtureHolding, mockHolding, mockUsdHolding } from '@/test/mock-data'
import { ApiError } from '@/lib/api'
import { mockLedgerHooks } from '@/test/ledger-mocks'

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

import { usePortfolioHoldings, useRemoveFromPortfolio, useUpdatePosition, useClosedPositions, useLogDividend } from '@/hooks/use-portfolio'
const mockUsePortfolioHoldings = vi.mocked(usePortfolioHoldings)
vi.mocked(useRemoveFromPortfolio).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as unknown as ReturnType<typeof useRemoveFromPortfolio>)
vi.mocked(useUpdatePosition).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as unknown as ReturnType<typeof useUpdatePosition>)
vi.mocked(useClosedPositions).mockReturnValue({ data: [] } as unknown as ReturnType<typeof useClosedPositions>)
vi.mocked(useLogDividend).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as unknown as ReturnType<typeof useLogDividend>)
const mockNavigate = vi.fn()
vi.mocked(useNavigate).mockReturnValue(mockNavigate)

function show(...data: ReturnType<typeof fixtureHolding>[]) {
  mockUsePortfolioHoldings.mockReturnValue({ data, isLoading: false } as unknown as ReturnType<typeof usePortfolioHoldings>)
  return render(
    <MemoryRouter>
      <HoldingsTable />
    </MemoryRouter>,
  )
}

// The rows are the recorded API responses (public/mock-data/portfolio/holdings.json) through the real mapper.
import { beforeEach } from 'vitest'
beforeEach(() => {
  mockNavigate.mockClear()
  mockLedgerHooks()
})

describe('HoldingsTable', () => {
  it('shows loading skeleton while loading', () => {
    mockUsePortfolioHoldings.mockReturnValue({ data: undefined, isLoading: true } as unknown as ReturnType<typeof usePortfolioHoldings>)
    const { container } = render(
      <MemoryRouter>
        <HoldingsTable />
      </MemoryRouter>,
    )
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('shows empty state when no holdings', () => {
    show()
    expect(screen.getByText('No holdings found.')).toBeInTheDocument()
  })

  it('renders a row for each holding with its account', () => {
    show(mockHolding, fixtureHolding('SHOP.TO'))
    expect(screen.getByText('RY.TO')).toBeInTheDocument()
    expect(screen.getByText('SHOP.TO')).toBeInTheDocument()
    expect(screen.getByText('RRSP')).toBeInTheDocument()
    expect(screen.getByText('TFSA')).toBeInTheDocument()
  })

  it('navigates to the stock page on row click', () => {
    show(mockHolding)
    fireEvent.click(screen.getByText('RY.TO'))
    expect(mockNavigate).toHaveBeenCalledWith(`/stocks/${mockHolding.stock.stock_id}`)
  })

  it('shows the call of a usable analysis: outlook, confidence and its age', () => {
    show(mockHolding)
    expect(screen.getByText('Bullish')).toBeInTheDocument()
    expect(screen.getByText(/Analysed/)).toBeInTheDocument()
  })

  it('names why a stale call cannot be used, and still shows the call', () => {
    show(fixtureHolding('TD.TO'))
    expect(screen.getByText(/Somewhat Bullish/)).toBeInTheDocument()
    expect(screen.getByText('Analysis is out of date')).toBeInTheDocument()
  })

  it('flags a holding the pipeline cannot analyse and shows no outlook for it', () => {
    show(fixtureHolding('VFV.TO'))
    expect(screen.getByText('Unsupported')).toBeInTheDocument()
    expect(screen.queryByText('Bullish')).not.toBeInTheDocument()
  })

  it('does not flag a supported holding', () => {
    show(mockHolding)
    expect(screen.queryByText('Unsupported')).not.toBeInTheDocument()
  })

  it('formats a USD holding in USD, with the gain in Canadian dollars', () => {
    show(mockUsdHolding)
    expect(screen.getByText('US$3,413.20')).toBeInTheDocument()
    expect(screen.getByText(/-\$232\.09/)).toBeInTheDocument()
  })

  it('expands a row to every detail field, and collapses it again', () => {
    show(mockHolding)
    const toggle = screen.getByRole('button', { name: 'Show details of RY.TO (RRSP)' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(toggle)
    const details = screen.getByRole('button', { name: 'Hide details of RY.TO (RRSP)' })
    expect(details).toHaveAttribute('aria-expanded', 'true')
    const list = within(screen.getByRole('table')).getAllByRole('term')
    const labels = list.map((t) => t.textContent)
    expect(labels).toEqual(expect.arrayContaining(['Cost base (CAD)', 'Weight', 'Sector']))
    expect(mockNavigate).not.toHaveBeenCalled()
    fireEvent.click(details)
    expect(screen.queryAllByRole('term')).toHaveLength(0)
  })

  it('navigates with the keyboard (Enter on a focused row)', () => {
    mockNavigate.mockClear()
    show(mockHolding)
    const row = screen.getByRole('row', { name: 'View RY.TO' })
    expect(row).toHaveAttribute('tabindex', '0')
    fireEvent.keyDown(row, { key: 'Enter' })
    expect(mockNavigate).toHaveBeenCalledWith(`/stocks/${mockHolding.stock.stock_id}`)
  })

  it('gives icon-only action buttons accessible names, and they do not navigate', () => {
    mockNavigate.mockClear()
    show(mockHolding)
    expect(screen.getByRole('button', { name: 'Buy more RY.TO (RRSP)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit RY.TO (RRSP)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove RY.TO (RRSP)' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Sell RY.TO (RRSP)' }))
    expect(mockNavigate).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toHaveTextContent('Sell RY.TO')
  })

  it('shows an error with retry when holdings fail to load', () => {
    const refetch = vi.fn()
    mockUsePortfolioHoldings.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new ApiError('x', null, 'network_error', '/api/portfolios/p1/holdings'),
      refetch,
    } as unknown as ReturnType<typeof usePortfolioHoldings>)
    render(
      <MemoryRouter>
        <HoldingsTable />
      </MemoryRouter>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Failed to load holdings.')
    expect(screen.getByRole('alert')).toHaveTextContent('Could not reach the server.')
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(refetch).toHaveBeenCalled()
  })
})
