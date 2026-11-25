import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { LogDividendDialog } from './LogDividendDialog'
import { mockHolding } from '@/test/mock-data'
import { mockLedgerHooks } from '@/test/ledger-mocks'

vi.mock('@/hooks/use-portfolio')

let ledger: ReturnType<typeof mockLedgerHooks>
beforeEach(() => {
  ledger = mockLedgerHooks()
})

const holding = { ...mockHolding, shares: 50, current_price: 100 }
const set = (label: RegExp | string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } })
const rows = () => (ledger.calls.preview[0].body as { events: Record<string, unknown>[] }).events
const review = () => fireEvent.click(screen.getByRole('button', { name: 'Review' }))
const drip = () => screen.getByLabelText(/DRIP/)
const keepAsCash = () => fireEvent.click(drip()) // the account reinvests, so DRIP starts ticked

// The original Log Dividend form: the amount per share, the payment date, and a DRIP toggle with the reinvestment price.
describe('LogDividendDialog', () => {
  it('renders nothing without a holding', () => {
    const { container } = render(<LogDividendDialog holding={null} onClose={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the shares held, and asks for the amount per share and the payment date only', () => {
    render(<LogDividendDialog holding={holding} onClose={vi.fn()} />)
    expect(screen.getByText('Shares held').nextSibling).toHaveTextContent('50')
    expect(screen.getByLabelText(/Amount per share/)).toBeInTheDocument()
    expect(screen.getByLabelText('Payment date')).toBeInTheDocument()
    expect(screen.queryByLabelText(/Tax withheld/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Reason/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Notes/)).not.toBeInTheDocument()
  })

  it("starts with DRIP ticked, because the account reinvests its dividends", () => {
    render(<LogDividendDialog holding={holding} onClose={vi.fn()} />)
    expect(drip()).toBeChecked()
  })

  it('records one dividend row for the amount per share times the shares held, and shows the total', () => {
    render(<LogDividendDialog holding={holding} onClose={vi.fn()} />)
    keepAsCash()
    expect(screen.getByRole('button', { name: 'Review' })).toBeDisabled()
    set(/Amount per share/, '0.4')
    expect(screen.getByText('$20.00')).toBeInTheDocument()
    review()
    expect(rows()).toHaveLength(1)
    expect(rows()[0]).toMatchObject({ transaction_type: 'dividend', ticker: 'RY.TO', total_amount: 20, account_type: 'rrsp' })
    expect(rows()[0]).not.toHaveProperty('withholding_tax')
  })

  it('adds the drip row in the same call: reinvesting the whole dividend in fractional shares', () => {
    render(<LogDividendDialog holding={holding} onClose={vi.fn()} />)
    set(/Amount per share/, '0.9')
    expect(screen.getByLabelText(/Reinvestment price per share/)).toHaveValue(100)
    set(/Reinvestment price per share/, '10')
    review()
    expect(rows().map((r) => r.transaction_type)).toEqual(['dividend', 'drip'])
    expect(rows()[0]).toMatchObject({ total_amount: 45 })
    expect(rows()[1]).toMatchObject({ shares: 4.5, price_per_share: 10, total_amount: 45 })
  })

  it('takes the shares actually bought over the calculated ones, and refuses more than the dividend paid', () => {
    render(<LogDividendDialog holding={holding} onClose={vi.fn()} />)
    set(/Amount per share/, '0.4')
    expect(screen.getByLabelText('Shares bought')).toHaveAttribute('placeholder', '0.2')
    set('Shares bought', '0.3')
    expect(screen.getByRole('alert')).toHaveTextContent('Reinvests more than the dividend paid')
    expect(screen.getByRole('button', { name: 'Review' })).toBeDisabled()
    set('Shares bought', '0.19')
    review()
    expect(rows()[1]).toMatchObject({ shares: 0.19, total_amount: 19 })
  })

  it('records nothing while DRIP is on without a price, instead of keeping the dividend as cash', () => {
    render(<LogDividendDialog holding={holding} onClose={vi.fn()} />)
    set(/Amount per share/, '0.4')
    set(/Reinvestment price per share/, '')
    expect(screen.getByRole('button', { name: 'Review' })).toBeDisabled()
  })
})
