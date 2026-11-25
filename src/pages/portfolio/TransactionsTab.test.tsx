import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { TransactionsTab } from './TransactionsTab'
import { mapTransactions, type ApiTransaction } from '@/lib/portfolio-mappers'
import { mockHoldings } from '@/test/mock-data'
import transactionsFixture from '../../../public/mock-data/portfolio/transactions.json'

vi.mock('@/hooks/use-portfolio')
vi.mock('@/hooks/use-portfolio-id', () => ({ usePortfolioId: () => ({ portfolioId: 'p1' }) }))
vi.mock('@/lib/csv', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/csv')>()), downloadFile: vi.fn() }))
import {
  fetchAllTransactions,
  useClosedPositions,
  useCorrectTransaction,
  usePortfolioHoldings,
  useReverseTransaction,
  useTransactions,
} from '@/hooks/use-portfolio'
import { downloadFile } from '@/lib/csv'
import { ApiError } from '@/lib/api'

// The ledger rows are the recorded API response (public/mock-data/portfolio/transactions.json) through the real mapper.
const rows = mapTransactions((transactionsFixture.data as unknown as ApiTransaction[]).slice(0, 5))
const meta = { total: 41, page: 1, per_page: 20, pages: 3 }
const correct = vi.fn()
const reverse = vi.fn()

function mockLedger(over: Record<string, unknown> = {}) {
  vi.mocked(useTransactions).mockReturnValue({ data: { rows, meta }, isLoading: false, isError: false, isPlaceholderData: false, ...over } as unknown as ReturnType<typeof useTransactions>)
}

beforeEach(() => {
  vi.mocked(useTransactions).mockReset()
  mockLedger()
  vi.mocked(usePortfolioHoldings).mockReturnValue({ data: mockHoldings.filter((h) => h.is_active) } as unknown as ReturnType<typeof usePortfolioHoldings>)
  vi.mocked(useClosedPositions).mockReturnValue({ data: mockHoldings.filter((h) => !h.is_active) } as unknown as ReturnType<typeof useClosedPositions>)
  vi.mocked(useCorrectTransaction).mockReturnValue({ mutate: correct, error: null } as unknown as ReturnType<typeof useCorrectTransaction>)
  vi.mocked(useReverseTransaction).mockReturnValue({ mutate: reverse, error: null } as unknown as ReturnType<typeof useReverseTransaction>)
  vi.mocked(downloadFile).mockClear()
  correct.mockClear()
  reverse.mockClear()
})

function LocationProbe() {
  const location = useLocation()
  return <output data-testid="search">{location.search}</output>
}

function renderAt(url: string, accountFilter: 'combined' | 'tfsa' | 'rrsp' = 'combined') {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[url]}>
        <TransactionsTab accountFilter={accountFilter} />
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const lastCall = () => vi.mocked(useTransactions).mock.calls.at(-1)!

describe('TransactionsTab', () => {
  it('lists the rows the server returned, with the paging line', () => {
    renderAt('/portfolio?tab=transactions')
    expect(screen.getAllByRole('row')).toHaveLength(rows.length + 1)
    expect(screen.getByText('Page 1 of 3 (41 transactions)')).toBeInTheDocument()
  })

  it('shows cash entries (no stock) as Cash', () => {
    const cash = { ...rows[0], stock: null }
    mockLedger({ data: { rows: [cash], meta: { ...meta, pages: 1, total: 1 } } })
    renderAt('/portfolio?tab=transactions')
    expect(screen.getByText('Cash')).toBeInTheDocument()
  })

  it('offers all 14 ledger types', () => {
    renderAt('/portfolio?tab=transactions')
    expect(within(screen.getByLabelText('Type')).getAllByRole('option')).toHaveLength(15) // All + 14
  })

  it('sends the URL filters and the account switcher to the server', () => {
    renderAt('/portfolio?tab=transactions&ticker=RY.TO&from=2026-02-01&type=dividend', 'tfsa')
    const [filters, view, page] = lastCall()
    expect(filters).toMatchObject({ ticker: 'RY.TO', from: '2026-02-01', type: 'dividend' })
    expect(view).toBe('tfsa')
    expect(page).toBe(1)
    expect(screen.getByLabelText('Ticker')).toHaveValue('RY.TO')
    expect(screen.getByLabelText('From')).toHaveValue('2026-02-01')
  })

  it('writes filter changes to the URL', () => {
    renderAt('/portfolio?tab=transactions')
    fireEvent.change(screen.getByLabelText('Ticker'), { target: { value: 'TD.TO' } })
    expect(screen.getByTestId('search')).toHaveTextContent('ticker=TD.TO')
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-03-31' } })
    expect(screen.getByTestId('search')).toHaveTextContent('to=2026-03-31')
  })

  it('offers every ticker held, active or closed, and keeps an active ticker nobody holds', () => {
    renderAt('/portfolio?tab=transactions&ticker=ZZZ')
    const options = within(screen.getByLabelText('Ticker')).getAllByRole('option').map((o) => o.textContent)
    expect(options).toContain('XOM')
    expect(options).toContain('RY.TO')
    expect(options).toContain('ZZZ')
  })

  it('asks for the next page, and goes back to page one when a filter changes', () => {
    renderAt('/portfolio?tab=transactions')
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(lastCall()[2]).toBe(2)
    fireEvent.change(screen.getByLabelText('Ticker'), { target: { value: 'TD.TO' } })
    expect(lastCall()[2]).toBe(1)
  })

  it('flags an inverted date range instead of silently showing nothing', () => {
    renderAt('/portfolio?tab=transactions&from=2026-03-01&to=2026-01-01')
    expect(screen.getByRole('alert')).toHaveTextContent('“From” date is after the “To” date')
  })

  it('clears all filters', () => {
    renderAt('/portfolio?tab=transactions&ticker=RY.TO&type=buy')
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(screen.getByTestId('search')).toHaveTextContent('?tab=transactions')
  })

  it('ignores malformed values in the URL', () => {
    renderAt('/portfolio?tab=transactions&from=yesterday&type=nonsense')
    expect(lastCall()[0]).toMatchObject({ from: null, type: 'all' })
  })

  it('shows one position’s history from "View history"', () => {
    const xom = mockHoldings.find((h) => h.stock.ticker === 'XOM')!
    renderAt(`/portfolio?tab=transactions&holding=${xom.holding_id}`, 'tfsa')
    expect(screen.getByText(/Showing full history for/)).toHaveTextContent('XOM (RRSP)')
    expect(lastCall()[0].holdingId).toBe(xom.holding_id)
    fireEvent.click(screen.getByRole('button', { name: 'Show all transactions' }))
    expect(screen.queryByText(/Showing full history for/)).not.toBeInTheDocument()
  })

  it('shows the empty states', () => {
    mockLedger({ data: { rows: [], meta: { ...meta, pages: 1, total: 0 } } })
    renderAt('/portfolio?tab=transactions')
    expect(screen.getByText('No transactions yet.')).toBeInTheDocument()
  })

  it('expands an entry to every detail field, with Correct and Reverse', () => {
    renderAt('/portfolio?tab=transactions')
    fireEvent.click(screen.getAllByRole('button', { name: 'Show details of this entry' })[0])
    expect(screen.getByText('Entry id')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Correct' }))
    expect(correct).toHaveBeenCalledWith(rows[0].transaction_id)
    fireEvent.click(screen.getByRole('button', { name: 'Reverse' }))
    expect(reverse).toHaveBeenCalledWith(rows[0].transaction_id)
  })

  it('shows the not-connected error a Correct or Reverse raises', () => {
    vi.mocked(useReverseTransaction).mockReturnValue({ mutate: reverse, error: new ApiError('Reversing a ledger entry is not connected yet (P-W8, ticket 86bd5z6mq).', null, 'not_connected', '') } as unknown as ReturnType<typeof useReverseTransaction>)
    renderAt('/portfolio?tab=transactions')
    expect(screen.getByRole('alert')).toHaveTextContent('P-W8')
  })

  it('exports every row of the filter as CSV from the registry', async () => {
    vi.mocked(fetchAllTransactions).mockResolvedValue(rows)
    renderAt('/portfolio?tab=transactions&ticker=TD.TO')
    fireEvent.click(screen.getByRole('button', { name: /Export CSV/ }))
    await waitFor(() => expect(downloadFile).toHaveBeenCalled())
    expect(vi.mocked(fetchAllTransactions).mock.calls[0][1]).toMatchObject({ ticker: 'TD.TO' })
    const csv = vi.mocked(downloadFile).mock.calls[0][0] as string
    expect(csv.split('\n')[0]).toContain('Entry id')
    expect(csv.split('\n')).toHaveLength(rows.length + 1)
  })

  it('shows an error with retry when the ledger fails to load', () => {
    const refetch = vi.fn()
    mockLedger({ data: undefined, isError: true, error: new ApiError('x', null, 'network_error', '/api'), refetch })
    renderAt('/portfolio?tab=transactions')
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(refetch).toHaveBeenCalled()
  })
})
