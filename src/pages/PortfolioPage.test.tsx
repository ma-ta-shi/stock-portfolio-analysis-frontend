import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { PortfolioPage } from './PortfolioPage'

// The subtab sections have their own tests; stub them to see which one is shown and with what filter.
vi.mock('./portfolio/HoldingsTable', () => ({ HoldingsTable: ({ accountFilter }: { accountFilter: string }) => <div>holdings:{accountFilter}</div> }))
vi.mock('./portfolio/DividendsTab', () => ({ DividendsTab: () => null }))
vi.mock('./portfolio/BrokerChecks', () => ({ BrokerChecks: () => null }))
vi.mock('./portfolio/TransactionsTab', () => ({ TransactionsTab: ({ accountFilter }: { accountFilter: string }) => <div>transactions:{accountFilter}</div> }))
vi.mock('./portfolio/PortfolioOptimizerSection', () => ({ PortfolioOptimizerSection: () => <div>optimizer-section</div> }))
vi.mock('./portfolio/AllocationCharts', () => ({ AllocationCharts: () => <div>allocation-charts</div> }))
vi.mock('@/components/AddStockDialog', () => ({ AddStockDialog: ({ open }: { open: boolean }) => (open ? <div>add-stock-dialog</div> : null) }))
vi.mock('./portfolio/SummaryHeader', () => ({ SummaryHeader: ({ accountView }: { accountView: string }) => <div>header:{accountView}</div> }))
vi.mock('@/hooks/use-portfolio-id')
vi.mock('@/context/UserContext', () => ({ useUser: () => ({ userId: 'u1', setUserId: vi.fn() }) }))
vi.mock('@/hooks/use-portfolio')
import { usePortfolioId } from '@/hooks/use-portfolio-id'

function Probe() {
  return <output data-testid="search">{useLocation().search}</output>
}

function renderPage(url = '/portfolio') {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[url]}>
        <PortfolioPage />
        <Probe />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  sessionStorage.clear()
  vi.mocked(usePortfolioId).mockReturnValue({ portfolioId: 'p1', isEmpty: false, isError: false } as unknown as ReturnType<typeof usePortfolioId>)
})

describe('PortfolioPage account switcher', () => {
  it('passes the selected account to the header and the tabs', () => {
    renderPage()
    expect(screen.getByText('header:combined')).toBeInTheDocument()
    fireEvent.click(within(screen.getByRole('group', { name: 'Account' })).getByRole('button', { name: 'TFSA' }))
    expect(screen.getByText('header:tfsa')).toBeInTheDocument()
    expect(screen.getByText('holdings:tfsa')).toBeInTheDocument()
  })

  it('remembers the selected account for the session', () => {
    const { unmount } = renderPage()
    fireEvent.click(within(screen.getByRole('group', { name: 'Account' })).getByRole('button', { name: 'RRSP' }))
    unmount()
    renderPage()
    expect(within(screen.getByRole('group', { name: 'Account' })).getByRole('button', { name: 'RRSP' })).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('PortfolioPage without a portfolio', () => {
  it('says what is missing when the user has no portfolio yet (P-R1)', () => {
    vi.mocked(usePortfolioId).mockReturnValue({ portfolioId: null, isEmpty: true, isError: false } as unknown as ReturnType<typeof usePortfolioId>)
    renderPage()
    expect(screen.getByText(/P-R1/)).toBeInTheDocument()
  })

  it('shows an error with retry when the portfolio cannot be looked up', () => {
    const refetch = vi.fn()
    vi.mocked(usePortfolioId).mockReturnValue({ portfolioId: null, isEmpty: false, isError: true, error: new Error('x'), refetch } as unknown as ReturnType<typeof usePortfolioId>)
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(refetch).toHaveBeenCalled()
  })
})

describe('PortfolioPage tabs', () => {
  it('opens the tab named in the URL', () => {
    renderPage('/portfolio?tab=transactions')
    expect(screen.getByRole('tab', { name: 'Transactions', selected: true })).toBeInTheDocument()
    expect(screen.getByText('transactions:combined')).toBeInTheDocument()
  })

  it('falls back to Holdings for an unknown tab', () => {
    renderPage('/portfolio?tab=nonsense')
    expect(screen.getByRole('tab', { name: 'Holdings', selected: true })).toBeInTheDocument()
  })

  it('writes the tab to the URL and drops the old tab’s filters', () => {
    renderPage('/portfolio?tab=transactions&ticker=RY.TO')
    fireEvent.click(screen.getByRole('tab', { name: 'Allocation' }))
    expect(screen.getByTestId('search')).toHaveTextContent('?tab=allocation')
    fireEvent.click(screen.getByRole('tab', { name: 'Holdings' }))
    expect(screen.getByTestId('search')).toBeEmptyDOMElement()
  })

  it('only offers "Add Stock" on the Holdings tab', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Add Stock' }))
    expect(screen.getByText('add-stock-dialog')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: 'Optimizer' }))
    expect(screen.queryByRole('button', { name: 'Add Stock' })).not.toBeInTheDocument()
  })
})

describe('Analyze allocation', () => {
  it('needs a positive amount', () => {
    renderPage('/portfolio?tab=optimizer')
    const analyze = screen.getByRole('button', { name: 'Analyze allocation' })
    expect(analyze).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Available to trade:'), { target: { value: '0' } })
    expect(analyze).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Available to trade:'), { target: { value: '5000' } })
    expect(analyze).toBeEnabled()
  })
})
