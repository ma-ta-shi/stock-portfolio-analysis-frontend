import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { BuySharesDialog } from './BuySharesDialog'
import { mockHolding, mockUsdHolding } from '@/test/mock-data'
import { mockLedgerHooks } from '@/test/ledger-mocks'
import { ApiError } from '@/lib/api'

vi.mock('@/hooks/use-portfolio')

let ledger: ReturnType<typeof mockLedgerHooks>
beforeEach(() => {
  ledger = mockLedgerHooks()
})

// RY.TO in the RRSP, from the recorded holdings, with round numbers for the arithmetic.
const holding = { ...mockHolding, shares: 50, average_cost_basis: 130, total_book_cost: 6500, current_price: 145 }
const set = (label: RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } })
const review = () => fireEvent.click(screen.getByRole('button', { name: 'Review' }))

describe('BuySharesDialog', () => {
  it('renders nothing without a holding', () => {
    const { container } = render(<BuySharesDialog holding={null} onClose={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it("prefills the price with the current price and the fees with the account's commission", () => {
    render(<BuySharesDialog holding={holding} onClose={vi.fn()} />)
    expect(screen.getByLabelText(/Price per share \(CAD\)/)).toHaveValue(145)
    expect(screen.getByLabelText(/Fees \(CAD\)/)).toHaveValue(9.99) // the recorded RRSP account's commission_per_trade
  })

  it('shows the position it buys into', () => {
    render(<BuySharesDialog holding={holding} onClose={vi.fn()} />)
    expect(screen.getByText('Shares held').nextSibling).toHaveTextContent('50')
    expect(screen.getByText('Avg cost').nextSibling).toHaveTextContent('$130.00')
    expect(screen.getByText('Book cost').nextSibling).toHaveTextContent('$6,500.00')
  })

  it('shows a US holding in USD, with the exchange rate field and no default fee', () => {
    render(<BuySharesDialog holding={mockUsdHolding} onClose={vi.fn()} />)
    expect(screen.getByLabelText(/Price per share \(USD\)/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Fees \(USD\)/)).toHaveValue(null) // the commission is in CAD
    expect(screen.getByLabelText(/Exchange rate/)).toBeInTheDocument()
  })

  it('has no exchange rate field for a Canadian stock', () => {
    render(<BuySharesDialog holding={holding} onClose={vi.fn()} />)
    expect(screen.queryByLabelText(/Exchange rate/)).not.toBeInTheDocument()
  })

  it('cannot be reviewed without a share count', () => {
    render(<BuySharesDialog holding={holding} onClose={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Review' })).toBeDisabled()
    set(/Shares to buy/, '0')
    expect(screen.getByRole('button', { name: 'Review' })).toBeDisabled()
  })

  it('reviews the entry with the server and sends the day as a plain string, not a UTC timestamp', () => {
    render(<BuySharesDialog holding={holding} onClose={vi.fn()} />)
    set(/Shares to buy/, '10')
    set(/Transaction date/, '2026-03-15')
    review()
    expect(ledger.calls.preview).toEqual([
      {
        params: undefined,
        body: {
          events: [
            {
              account_type: 'rrsp', transaction_type: 'buy', ticker: 'RY.TO', shares: 10, price_per_share: 145, total_amount: 1450,
              currency: 'CAD', transaction_date: '2026-03-15', fees: 9.99,
            },
          ],
        },
      },
    ]) // fmt: skip
    expect(screen.getByText('Shares after')).toBeInTheDocument() // the server's preview is on screen
  })

  it('records exactly what was reviewed, shows what was recorded, and closes on request', () => {
    const onClose = vi.fn()
    render(<BuySharesDialog holding={holding} onClose={onClose} />)
    set(/Shares to buy/, '10')
    review()
    fireEvent.click(screen.getByRole('button', { name: 'Buy shares' }))
    expect(ledger.calls.record).toEqual(ledger.calls.preview)
    expect(screen.getByRole('status')).toHaveTextContent('Recorded 1 entry')
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('asks for a new review after any edit', () => {
    render(<BuySharesDialog holding={holding} onClose={vi.fn()} />)
    set(/Shares to buy/, '10')
    review()
    set(/Shares to buy/, '11')
    expect(screen.queryByRole('button', { name: 'Buy shares' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Review' })).toBeEnabled()
  })

  it('sends the exchange rate of a US purchase when typed', () => {
    render(<BuySharesDialog holding={mockUsdHolding} onClose={vi.fn()} />)
    set(/Shares to buy/, '2')
    set(/Exchange rate/, '1.37')
    review()
    expect(ledger.calls.preview[0].body).toMatchObject({ events: [{ currency: 'USD', fx_rate_to_cad: 1.37, ticker: 'RDDT' }] })
  })

  it("shows the backend's explanation when the record fails, and keeps the form", () => {
    ledger.outcomes.record = { error: new ApiError('dup', 409, 'DUPLICATE_ENTRY', '/u') }
    render(<BuySharesDialog holding={holding} onClose={vi.fn()} />)
    set(/Shares to buy/, '10')
    review()
    fireEvent.click(screen.getByRole('button', { name: 'Buy shares' }))
    expect(screen.getByRole('alert')).toHaveTextContent(/last 30 seconds/)
    expect(screen.getByLabelText(/Shares to buy/)).toHaveValue(10)
  })
})
