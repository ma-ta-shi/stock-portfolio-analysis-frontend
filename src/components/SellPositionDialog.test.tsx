import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { SellPositionDialog } from './SellPositionDialog'
import { mockHolding, mockUsdHolding } from '@/test/mock-data'
import { mockLedgerHooks, PREVIEW_OF_A_BUY } from '@/test/ledger-mocks'

vi.mock('@/hooks/use-portfolio')

let ledger: ReturnType<typeof mockLedgerHooks>
beforeEach(() => {
  ledger = mockLedgerHooks()
})

const trading = { ...mockHolding, account_type: 'trading' as const, shares: 100, average_cost_basis: 100, current_price: 150 }
const set = (label: RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } })
const review = () => fireEvent.click(screen.getByRole('button', { name: 'Review' }))

describe('SellPositionDialog', () => {
  it('renders nothing without a holding', () => {
    const { container } = render(<SellPositionDialog holding={null} onClose={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('links every field to its label, with all shares and the current price filled in', () => {
    render(<SellPositionDialog holding={trading} onClose={vi.fn()} />)
    expect(screen.getByLabelText(/Shares to sell/)).toHaveValue(100)
    expect(screen.getByLabelText(/Price per share \(CAD\)/)).toHaveValue(150)
    expect(screen.getByLabelText(/Fees \(CAD\)/)).toHaveValue(9.99)
    expect(screen.getByLabelText(/Transaction date/)).toBeInTheDocument()
  })

  it('sends a sale with negative shares and the positive proceeds', () => {
    render(<SellPositionDialog holding={trading} onClose={vi.fn()} />)
    set(/Shares to sell/, '10')
    review()
    expect(ledger.calls.preview[0].body).toMatchObject({
      events: [{ transaction_type: 'sell', account_type: 'trading', ticker: 'RY.TO', shares: -10, price_per_share: 150, total_amount: 1500 }],
    })
  })

  it('shows the realised gain, the tax estimate and the superficial-loss note the server worked out', () => {
    ledger.outcomes.preview = {
      data: {
        ...PREVIEW_OF_A_BUY,
        row: { realized_gain_loss: 490, realized_gain_loss_cad: 490, denied_loss_cad: null, denied_loss_lost_cad: null },
        estimated_tax: { capital_gain: 490, taxable_capital_gain: 245, estimated_tax: 77.1, marginal_rate: 31.48 },
        notes: ['CAD 272.73 of the loss is denied (superficial loss)'],
      },
    }
    render(<SellPositionDialog holding={trading} onClose={vi.fn()} />)
    set(/Shares to sell/, '10')
    review()
    expect(screen.getByText('Realised gain or loss').nextSibling).toHaveTextContent('+$490.00')
    expect(screen.getByText('Estimated tax effect (CAD)').nextSibling).toHaveTextContent('$77.10')
    expect(screen.getByText('Marginal rate').nextSibling).toHaveTextContent('31.48%')
    expect(screen.getByRole('list', { name: 'Notes' })).toHaveTextContent('superficial loss')
  })

  it('says when the sale closes the position', () => {
    ledger.outcomes.preview = { data: { ...PREVIEW_OF_A_BUY, position: { ...PREVIEW_OF_A_BUY.position!, shares: 0, is_active: false } } }
    render(<SellPositionDialog holding={trading} onClose={vi.fn()} />)
    review()
    expect(screen.getByText('Closes this position').nextSibling).toHaveTextContent('Yes')
  })

  it('rejects selling more shares than held', () => {
    render(<SellPositionDialog holding={trading} onClose={vi.fn()} />)
    set(/Shares to sell/, '101')
    expect(screen.getByText('Cannot exceed 100 shares')).toBeInTheDocument()
    expect(screen.getByLabelText(/Shares to sell/)).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('button', { name: 'Review' })).toBeDisabled()
  })

  it('records the reviewed sale', () => {
    render(<SellPositionDialog holding={trading} onClose={vi.fn()} />)
    set(/Shares to sell/, '10')
    review()
    fireEvent.click(screen.getByRole('button', { name: 'Sell shares' }))
    expect(ledger.calls.record).toEqual(ledger.calls.preview)
    expect(screen.getByRole('status')).toHaveTextContent('Recorded')
  })

  it('shows a US holding in USD and sends its exchange rate when typed', () => {
    render(<SellPositionDialog holding={{ ...mockUsdHolding, account_type: 'trading' as const }} onClose={vi.fn()} />)
    expect(screen.getByLabelText(/Price per share \(USD\)/)).toBeInTheDocument()
    set(/Shares to sell/, '1')
    set(/Exchange rate/, '1.4')
    review()
    expect(ledger.calls.preview[0].body).toMatchObject({ events: [{ currency: 'USD', fx_rate_to_cad: 1.4 }] })
  })
})
