import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { BuySharesDialog } from './BuySharesDialog'
import { mockHolding, mockUsdHolding } from '@/test/mock-data'

vi.mock('@/hooks/use-portfolio')
import { useBuyShares } from '@/hooks/use-portfolio'

const mutateAsync = vi.fn()
beforeEach(() => {
  mutateAsync.mockReset().mockResolvedValue(undefined)
  vi.mocked(useBuyShares).mockReturnValue({ mutateAsync, isPending: false, isError: false, error: null } as unknown as ReturnType<typeof useBuyShares>)
})

const holding = { ...mockHolding, shares: 50, average_cost_basis: 130, current_price: 145 }
const set = (label: RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } })

describe('BuySharesDialog', () => {
  it('prefills price with the current price and fees with the default', () => {
    render(<BuySharesDialog holding={holding} onClose={vi.fn()} />)
    expect(screen.getByLabelText(/Price per share \(CAD\)/)).toHaveValue(145)
    expect(screen.getByLabelText(/Fees \(CAD\)/)).toHaveValue(4.99)
  })

  it('previews the new weighted-average cost (fees excluded from book cost, per backend spec)', () => {
    render(<BuySharesDialog holding={holding} onClose={vi.fn()} />)
    set(/Shares to buy/, '50')
    set(/Price per share/, '150')
    // (50 × 130 + 50 × 150) / 100 = 140
    expect(screen.getByText('New total shares').nextSibling).toHaveTextContent('100')
    expect(screen.getByText('New avg cost').nextSibling).toHaveTextContent('$140.00')
    expect(screen.getByText('New book cost').nextSibling).toHaveTextContent('$14,000.00')
    expect(screen.getByText('This purchase').nextSibling).toHaveTextContent('$7,500.00')
  })

  it('shows a USD holding in USD', () => {
    render(<BuySharesDialog holding={mockUsdHolding} onClose={vi.fn()} />)
    expect(screen.getByLabelText(/Price per share \(USD\)/)).toBeInTheDocument()
    expect(screen.getByText('Avg cost').nextSibling).toHaveTextContent('US$98.30')
  })

  it('cannot buy without a share count', () => {
    render(<BuySharesDialog holding={holding} onClose={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Buy shares' })).toBeDisabled()
    set(/Shares to buy/, '0')
    expect(screen.getByRole('button', { name: 'Buy shares' })).toBeDisabled()
  })

  it('submits the calendar date (not a UTC timestamp) and closes', async () => {
    const onClose = vi.fn()
    render(<BuySharesDialog holding={holding} onClose={onClose} />)
    set(/Shares to buy/, '10')
    set(/Transaction date/, '2026-03-15')
    fireEvent.click(screen.getByRole('button', { name: 'Buy shares' }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(mutateAsync).toHaveBeenCalledWith({
      holdingId: holding.holding_id,
      shares: 10,
      pricePerShare: 145,
      fees: 4.99,
      transactionDate: '2026-03-15',
    })
  })

  it('stays open when the purchase fails', async () => {
    mutateAsync.mockRejectedValueOnce(new Error('nope'))
    const onClose = vi.fn()
    render(<BuySharesDialog holding={holding} onClose={onClose} />)
    set(/Shares to buy/, '10')
    fireEvent.click(screen.getByRole('button', { name: 'Buy shares' }))
    await waitFor(() => expect(mutateAsync).toHaveBeenCalled())
    expect(onClose).not.toHaveBeenCalled()
  })
})
