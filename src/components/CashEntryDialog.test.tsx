import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { CashEntryDialog } from './CashEntryDialog'
import { mockLedgerHooks } from '@/test/ledger-mocks'

vi.mock('@/hooks/use-portfolio')

let ledger: ReturnType<typeof mockLedgerHooks>
beforeEach(() => {
  ledger = mockLedgerHooks()
})

const set = (label: RegExp | string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } })
const rowOf = (call: number) => (ledger.calls.preview[call].body as { events: Record<string, unknown>[] }).events[0]

describe('CashEntryDialog', () => {
  it('renders nothing while closed', () => {
    const { container } = render(<CashEntryDialog open={false} onClose={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('records a contribution to the account it starts on, with no ticker and no shares', () => {
    render(<CashEntryDialog open onClose={vi.fn()} account="rrsp" />)
    expect(screen.getByRole('button', { name: 'Review' })).toBeDisabled()
    set('Amount', '500')
    fireEvent.click(screen.getByRole('button', { name: 'Review' }))
    const row = rowOf(0)
    expect(row).toMatchObject({ account_type: 'rrsp', transaction_type: 'contribution', total_amount: 500, currency: 'CAD' })
    expect(row).not.toHaveProperty('ticker')
    expect(row).not.toHaveProperty('shares')
  })

  it.each(['withdrawal', 'fee', 'interest'])('offers %s as a type', (type) => {
    render(<CashEntryDialog open onClose={vi.fn()} />)
    set('Type', type)
    set('Amount', '12.5')
    fireEvent.click(screen.getByRole('button', { name: 'Review' }))
    expect(rowOf(0)).toMatchObject({ account_type: 'tfsa', transaction_type: type, total_amount: 12.5 })
  })

  it('shows the exchange rate only for US dollars', () => {
    render(<CashEntryDialog open onClose={vi.fn()} />)
    expect(screen.queryByLabelText(/Exchange rate/)).not.toBeInTheDocument()
    set('Currency', 'USD')
    set('Amount', '100')
    set(/Exchange rate/, '1.3')
    fireEvent.click(screen.getByRole('button', { name: 'Review' }))
    expect(rowOf(0)).toMatchObject({ currency: 'USD', fx_rate_to_cad: 1.3 })
  })

  it('asks what arrived for a conversion, in the other currency, and never sends a rate', () => {
    render(<CashEntryDialog open onClose={vi.fn()} />)
    set('Type', 'conversion')
    set('Currency', 'USD')
    expect(screen.queryByLabelText(/Exchange rate/)).not.toBeInTheDocument()
    set('Amount converted', '1000')
    expect(screen.getByRole('button', { name: 'Review' })).toBeDisabled()
    set(/Amount received \(CAD\)/, '1370')
    fireEvent.click(screen.getByRole('button', { name: 'Review' }))
    const row = rowOf(0)
    expect(row).toMatchObject({ transaction_type: 'conversion', currency: 'USD', total_amount: 1000, counter_currency: 'CAD', counter_amount: 1370 })
    expect(row).not.toHaveProperty('fx_rate_to_cad')
  })
})
