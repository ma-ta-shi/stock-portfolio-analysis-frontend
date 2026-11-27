import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ClosedPositions } from './ClosedPositions'
import { mockHoldings } from '@/test/mock-data'

vi.mock('@/hooks/use-portfolio')
import { useClosedPositions } from '@/hooks/use-portfolio'

// The recorded closed positions: TRP.TO (RRSP), POW.TO (TFSA) and AQN.TO (Trading).
const closed = mockHoldings.filter((h) => !h.is_active)
vi.mocked(useClosedPositions).mockReturnValue({ data: closed, isError: false } as unknown as ReturnType<typeof useClosedPositions>)

function renderClosed(accountFilter?: 'combined' | 'tfsa' | 'rrsp' | 'trading') {
  render(
    <MemoryRouter>
      <ClosedPositions accountFilter={accountFilter} />
    </MemoryRouter>,
  )
  fireEvent.click(screen.getByRole('button', { name: /Closed Positions/ }))
}

describe('ClosedPositions', () => {
  it('lists every closed position with its count', () => {
    renderClosed()
    expect(screen.getByRole('button', { name: /Closed Positions/ })).toHaveTextContent('(3)')
    for (const h of closed) expect(screen.getByText(h.stock.ticker)).toBeInTheDocument()
  })

  it('shows shares bought and sold as separate columns', () => {
    renderClosed()
    expect(screen.getByRole('columnheader', { name: 'Shares bought' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Shares sold' })).toBeInTheDocument()
  })

  it('links to the position’s full transaction history', () => {
    renderClosed()
    const trp = closed.find((h) => h.stock.ticker === 'TRP.TO')!
    const link = screen.getByRole('link', { name: 'View history for TRP.TO (RRSP)' })
    expect(link).toHaveAttribute('href', `/portfolio?tab=transactions&holding=${trp.holding_id}`)
  })

  it('expands a position to its remaining details', () => {
    renderClosed()
    fireEvent.click(screen.getByRole('button', { name: 'Show details of TRP.TO (RRSP)' }))
    expect(screen.getByText('Dividends received')).toBeInTheDocument()
    expect(screen.getByText('Fees paid')).toBeInTheDocument()
  })

  it('respects the account switcher', () => {
    renderClosed('tfsa')
    expect(screen.getByText('POW.TO')).toBeInTheDocument()
    expect(screen.queryByText('TRP.TO')).not.toBeInTheDocument()
  })

  it('renders nothing when the account has no closed positions', () => {
    vi.mocked(useClosedPositions).mockReturnValueOnce({ data: closed.filter((h) => h.account_type === 'rrsp'), isError: false } as unknown as ReturnType<typeof useClosedPositions>)
    render(
      <MemoryRouter>
        <ClosedPositions accountFilter="tfsa" />
      </MemoryRouter>,
    )
    expect(screen.queryByRole('button', { name: /Closed Positions/ })).not.toBeInTheDocument()
  })
})
