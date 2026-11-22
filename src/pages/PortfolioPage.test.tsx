import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { PortfolioPage } from './PortfolioPage'
import type { PortfolioSummary } from '@/types'

// The subtab sections have their own tests; stub them to see which one is shown and with what filter.
vi.mock('./portfolio/HoldingsTable', () => ({ HoldingsTable: ({ accountFilter }: { accountFilter: string }) => <div>holdings:{accountFilter}</div> }))
vi.mock('./portfolio/TransactionsTab', () => ({ TransactionsTab: ({ accountFilter }: { accountFilter: string }) => <div>transactions:{accountFilter}</div> }))
vi.mock('./portfolio/PortfolioOptimizerSection', () => ({ PortfolioOptimizerSection: () => <div>optimizer-section</div> }))
vi.mock('./portfolio/AllocationCharts', () => ({ AllocationCharts: () => <div>allocation-charts</div> }))
vi.mock('@/components/AddStockDialog', () => ({ AddStockDialog: ({ open }: { open: boolean }) => (open ? <div>add-stock-dialog</div> : null) }))
vi.mock('@/components/SparklineChart', () => ({ SparklineChart: () => null }))
vi.mock('@/context/UserContext', () => ({ useUser: () => ({ userId: 'user_01', setUserId: vi.fn() }) }))
vi.mock('@/hooks/use-portfolio')
import { usePortfolioSummary } from '@/hooks/use-portfolio'

const summary: PortfolioSummary = {
  user_id: 'user_01',
  total_value_cad: 85443.7,
  total_cost_cad: 68742.1,
  total_gain_loss_cad: 16701.6,
  total_gain_loss_pct: 0.2429,
  day_change_cad: -472.3,
  day_change_pct: -0.0055,
  by_account: {
    tfsa: { value: 12512.75, cost: 9458.4, gain_loss: 3054.35, gain_loss_pct: 0.3229 },
    rrsp: { value: 72930.95, cost: 59283.7, gain_loss: 13647.25, gain_loss_pct: 0.2302 },
  },
  sparkline_30d: [],
}

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
  vi.mocked(usePortfolioSummary).mockReturnValue({ data: summary, isLoading: false, isError: false } as unknown as ReturnType<typeof usePortfolioSummary>)
})

describe('PortfolioPage summary', () => {
  it('shows combined totals with signed gains and losses', () => {
    renderPage()
    expect(screen.getByText('$85,443.70')).toBeInTheDocument()
    expect(screen.getByText('+$16,701.60 (+24.29%)')).toBeInTheDocument()
    expect(screen.getByText('-$472.30 (-0.55%)')).toBeInTheDocument()
  })

  it('shows one account’s figures when that account is selected', () => {
    renderPage()
    fireEvent.click(within(screen.getByRole('group', { name: 'Account' })).getByRole('button', { name: 'TFSA' }))
    expect(screen.getByText('TFSA Value')).toBeInTheDocument()
    expect(screen.getByText('$12,512.75')).toBeInTheDocument()
    expect(screen.getByText('+$3,054.35 (+32.29%)')).toBeInTheDocument()
    expect(screen.getByText('holdings:tfsa')).toBeInTheDocument()
  })

  it('remembers the selected account for the session', () => {
    const { unmount } = renderPage()
    fireEvent.click(within(screen.getByRole('group', { name: 'Account' })).getByRole('button', { name: 'RRSP' }))
    unmount()
    renderPage()
    expect(within(screen.getByRole('group', { name: 'Account' })).getByRole('button', { name: 'RRSP' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('shows an error with retry when the summary fails', () => {
    const refetch = vi.fn()
    vi.mocked(usePortfolioSummary).mockReturnValue({ data: undefined, isLoading: false, isError: true, error: new Error('x'), refetch } as unknown as ReturnType<typeof usePortfolioSummary>)
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

  it('says clearly that it is not connected yet', async () => {
    renderPage('/portfolio?tab=optimizer')
    fireEvent.change(screen.getByLabelText('Available to trade:'), { target: { value: '5000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Analyze allocation' }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('isn’t connected to the backend yet'))
  })
})
