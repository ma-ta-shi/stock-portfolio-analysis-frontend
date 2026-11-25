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

describe('LogDividendDialog', () => {
  it('renders nothing without a holding', () => {
    const { container } = render(<LogDividendDialog holding={null} onClose={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the shares held and has no reason field', () => {
    render(<LogDividendDialog holding={holding} onClose={vi.fn()} />)
    expect(screen.getByText('Shares held').nextSibling).toHaveTextContent('50')
    expect(screen.queryByLabelText(/Reason/)).not.toBeInTheDocument()
    expect(screen.getByLabelText('Payment date')).toBeInTheDocument()
  })

  it('records one dividend row for the amount before tax, with the tax withheld', () => {
    render(<LogDividendDialog holding={holding} onClose={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Review' })).toBeDisabled()
    set(/Dividend before tax/, '20')
    set(/Tax withheld/, '3')
    review()
    expect(rows()).toHaveLength(1)
    expect(rows()[0]).toMatchObject({ transaction_type: 'dividend', ticker: 'RY.TO', total_amount: 20, withholding_tax: 3, account_type: 'rrsp' })
  })

  it('adds the drip row in the same call, buying what the dividend after tax buys', () => {
    render(<LogDividendDialog holding={holding} onClose={vi.fn()} />)
    set(/Dividend before tax/, '20')
    set(/Tax withheld/, '5')
    fireEvent.click(screen.getByLabelText('Reinvested as new shares'))
    expect(screen.getByLabelText('Shares bought')).toHaveValue(0.15) // (20 - 5) / 100
    review()
    expect(rows().map((r) => r.transaction_type)).toEqual(['dividend', 'drip'])
    expect(rows()[1]).toMatchObject({ shares: 0.15, price_per_share: 100, total_amount: 15 })
  })

  it('refuses tax above the dividend and a reinvestment above what arrived, saying why', () => {
    render(<LogDividendDialog holding={holding} onClose={vi.fn()} />)
    set(/Dividend before tax/, '20')
    set(/Tax withheld/, '25')
    expect(screen.getByRole('alert')).toHaveTextContent('The tax withheld is more than the dividend')
    expect(screen.getByRole('button', { name: 'Review' })).toBeDisabled()
    set(/Tax withheld/, '')
    fireEvent.click(screen.getByLabelText('Reinvested as new shares'))
    set('Shares bought', '0.5')
    expect(screen.getByRole('alert')).toHaveTextContent('Reinvests more than the dividend paid')
  })
})
