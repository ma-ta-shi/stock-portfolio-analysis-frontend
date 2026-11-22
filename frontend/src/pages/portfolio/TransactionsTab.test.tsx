import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { TransactionsTab } from './TransactionsTab'
import { mockHolding, mockUsdHolding } from '@/test/mock-data'
import type { Transaction } from '@/types'

vi.mock('@/hooks/use-portfolio')
import { useTransactions } from '@/hooks/use-portfolio'

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    transaction_id: 't', holding_id: 'h_001', user_id: 'user_01', stock: mockHolding.stock,
    account_type: 'tfsa', transaction_type: 'buy', shares: 10, price_per_share: 100,
    total_amount: 1000, fees: 0, currency: 'CAD', transaction_date: '2026-03-01',
    created_at: '2026-03-01T00:00:00Z', ...overrides,
  }
}

const data = [
  tx({ transaction_id: 'ry-buy', transaction_date: '2026-01-10' }),
  tx({ transaction_id: 'ry-div', transaction_date: '2026-02-15', transaction_type: 'dividend', shares: null }),
  tx({ transaction_id: 'msft-sell', transaction_date: '2026-03-20', transaction_type: 'sell', holding_id: 'h_002', stock: mockUsdHolding.stock, account_type: 'rrsp', currency: 'USD', shares: -5 }),
]
vi.mocked(useTransactions).mockReturnValue({ data, isLoading: false, isError: false } as unknown as ReturnType<typeof useTransactions>)

function LocationProbe() {
  const location = useLocation()
  return <output data-testid="search">{location.search}</output>
}

function renderAt(url: string, accountFilter: 'combined' | 'tfsa' | 'rrsp' = 'combined') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <TransactionsTab accountFilter={accountFilter} />
      <LocationProbe />
    </MemoryRouter>,
  )
}

const bodyRows = () => screen.getAllByRole('row').slice(1)

describe('TransactionsTab filters', () => {
  it('shows all transactions newest first by default', () => {
    renderAt('/portfolio?tab=transactions')
    expect(bodyRows()).toHaveLength(3)
    expect(within(bodyRows()[0]).getByText('MSFT')).toBeInTheDocument()
  })

  it('reads filters from the URL', () => {
    renderAt('/portfolio?tab=transactions&ticker=RY.TO&from=2026-02-01')
    expect(bodyRows()).toHaveLength(1)
    expect(within(bodyRows()[0]).getByText('Dividend')).toBeInTheDocument()
    expect(screen.getByLabelText('Ticker')).toHaveValue('RY.TO')
    expect(screen.getByLabelText('From')).toHaveValue('2026-02-01')
  })

  it('writes filter changes to the URL', () => {
    renderAt('/portfolio?tab=transactions')
    fireEvent.change(screen.getByLabelText('Ticker'), { target: { value: 'MSFT' } })
    expect(screen.getByTestId('search')).toHaveTextContent('ticker=MSFT')
    expect(bodyRows()).toHaveLength(1)
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-03-31' } })
    expect(screen.getByTestId('search')).toHaveTextContent('to=2026-03-31')
  })

  it('offers only tickers that have transactions in the current account view', () => {
    renderAt('/portfolio?tab=transactions', 'tfsa')
    const options = within(screen.getByLabelText('Ticker')).getAllByRole('option').map((o) => o.textContent)
    expect(options).toEqual(['All tickers', 'RY.TO'])
  })

  it('gives each filter a clean accessible name (not the dropdown options)', () => {
    renderAt('/portfolio?tab=transactions')
    expect(screen.getByRole('combobox', { name: 'Ticker' })).toBeInTheDocument()
    expect(screen.getByLabelText('From', { exact: true })).toHaveAttribute('type', 'date')
    expect(screen.getByLabelText('To', { exact: true })).toHaveAttribute('type', 'date')
  })

  it('keeps showing the active ticker after switching to an account without it', () => {
    renderAt('/portfolio?tab=transactions&ticker=MSFT', 'tfsa')
    expect(screen.getByRole('combobox', { name: 'Ticker' })).toHaveValue('MSFT')
    expect(screen.getByText('No transactions match these filters.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeInTheDocument()
  })

  it('flags an inverted date range instead of silently showing nothing', () => {
    renderAt('/portfolio?tab=transactions&from=2026-03-01&to=2026-01-01')
    expect(screen.getByRole('alert')).toHaveTextContent('“From” date is after the “To” date')
  })

  it('clears all filters', () => {
    renderAt('/portfolio?tab=transactions&ticker=RY.TO&type=buy')
    expect(bodyRows()).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(bodyRows()).toHaveLength(3)
    expect(screen.getByTestId('search')).toHaveTextContent('?tab=transactions')
  })

  it('ignores malformed values in the URL', () => {
    renderAt('/portfolio?tab=transactions&from=yesterday&type=nonsense')
    expect(bodyRows()).toHaveLength(3)
  })

  it('shows one position’s history from "View history", even when another account is selected', () => {
    renderAt('/portfolio?tab=transactions&holding=h_002', 'tfsa')
    expect(screen.getByText(/Showing full history for/)).toHaveTextContent('MSFT (RRSP)')
    expect(bodyRows()).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'Show all transactions' }))
    expect(screen.queryByText(/Showing full history for/)).not.toBeInTheDocument()
    expect(bodyRows()).toHaveLength(2) // back to the TFSA view
  })
})
