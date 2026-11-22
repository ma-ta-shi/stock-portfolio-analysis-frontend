import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ClosedPositions } from './ClosedPositions'
import { mockHolding } from '@/test/mock-data'
import type { ClosedPosition } from '@/types'

vi.mock('@/hooks/use-portfolio')
import { useClosedPositions } from '@/hooks/use-portfolio'

const closed: ClosedPosition[] = [
  {
    holding_id: 'hld_007', stock: { ...mockHolding.stock, ticker: 'TD.TO', name: 'Toronto-Dominion Bank' },
    account_type: 'trading', total_shares_bought: 120, avg_buy_price: 80, total_shares_sold: 120,
    avg_sell_price: 90, total_realized_gain_loss: 1200, total_realized_gain_loss_pct: 0.125,
    first_buy_date: '2024-06-15', last_sell_date: '2025-11-20',
  },
]
vi.mocked(useClosedPositions).mockReturnValue({ data: closed, isError: false } as unknown as ReturnType<typeof useClosedPositions>)

function renderClosed(accountFilter?: 'combined' | 'tfsa' | 'trading') {
  render(
    <MemoryRouter>
      <ClosedPositions accountFilter={accountFilter} />
    </MemoryRouter>,
  )
  fireEvent.click(screen.getByRole('button', { name: /Closed Positions/ }))
}

describe('ClosedPositions', () => {
  it('shows shares bought and sold as separate columns', () => {
    renderClosed()
    expect(screen.getByRole('columnheader', { name: 'Bought' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Sold' })).toBeInTheDocument()
    expect(screen.getAllByText('120')).toHaveLength(2)
  })

  it('links to the position’s full transaction history', () => {
    renderClosed()
    const link = screen.getByRole('link', { name: 'View history for TD.TO (TRADING)' })
    expect(link).toHaveAttribute('href', '/portfolio?tab=transactions&holding=hld_007')
  })

  it('shows the holding period', () => {
    renderClosed()
    expect(screen.getByText('1y 5mo')).toBeInTheDocument()
  })

  it('respects the account switcher', () => {
    render(
      <MemoryRouter>
        <ClosedPositions accountFilter="tfsa" />
      </MemoryRouter>,
    )
    expect(screen.queryByRole('button', { name: /Closed Positions/ })).not.toBeInTheDocument()
  })
})
