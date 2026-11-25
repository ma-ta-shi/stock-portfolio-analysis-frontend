import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { CorrectEntryDialog } from './CorrectEntryDialog'
import { mapTransactions, type ApiTransaction } from '@/lib/portfolio-mappers'
import { mockLedgerHooks } from '@/test/ledger-mocks'
import type { Transaction } from '@/types/portfolio'
import transactionsFixture from '../../public/mock-data/portfolio/transactions.json'

vi.mock('@/hooks/use-portfolio')

let ledger: ReturnType<typeof mockLedgerHooks>
beforeEach(() => {
  ledger = mockLedgerHooks({ commission: 9.99 })
})

// A recorded row (a TD.TO dividend) turned into the entry each test corrects.
const base = mapTransactions((transactionsFixture.data as unknown as ApiTransaction[]).slice(0, 1))[0]
const row = (over: Partial<Transaction>): Transaction => ({ ...base, reverses_transaction_id: null, move_id: null, fx_rate_to_cad: null, withholding_tax: null, counter_amount: null, reason_code: null, notes: null, ...over })
const buy = row({ transaction_id: 't-buy', transaction_type: 'buy', account_type: 'rrsp', shares: 10, price_per_share: 50, total_amount: 500, fees: 4.99, currency: 'CAD', transaction_date: '2026-11-20T00:00:00' })
const preview = () => fireEvent.click(screen.getByRole('button', { name: 'Review' }))
const entry = (call: number) => ledger.calls.preview[call].body as Record<string, unknown>

describe('CorrectEntryDialog: a trade', () => {
  it('starts from the entry, keeps its own fee (not the account commission), and fixes the account and stock', () => {
    render(<CorrectEntryDialog transaction={buy} onClose={vi.fn()} />)
    expect(screen.getByRole('dialog')).toHaveTextContent('Correct buy')
    expect(screen.getByLabelText(/Shares to buy/)).toHaveValue(10)
    expect(screen.getByLabelText(/Price per share/)).toHaveValue(50)
    expect(screen.getByLabelText(/Fees/)).toHaveValue(4.99)
    expect(screen.getByLabelText('Transaction date')).toHaveValue('2026-11-20')
    expect(screen.queryByLabelText('Account', { exact: true })).not.toBeInTheDocument()
  })

  it('previews and records one whole corrected entry (not wrapped), for the entry id', async () => {
    render(<CorrectEntryDialog transaction={buy} onClose={vi.fn()} />)
    fireEvent.change(screen.getByLabelText(/Price per share/), { target: { value: '52.5' } })
    preview()
    expect(ledger.calls.preview[0].params).toEqual({ id: 't-buy' })
    expect(entry(0)).toMatchObject({ account_type: 'rrsp', transaction_type: 'buy', ticker: base.stock!.ticker, shares: 10, price_per_share: 52.5, total_amount: 525, fees: 4.99 })
    expect(entry(0)).not.toHaveProperty('events')
    fireEvent.click(await screen.findByRole('button', { name: 'Replace entry' }))
    await waitFor(() => expect(ledger.calls.record).toHaveLength(1))
    expect(ledger.calls.record[0].params).toEqual({ id: 't-buy' })
  })

  it('shows a sale with positive shares and no maximum (the shares held already exclude the sale being replaced)', () => {
    render(<CorrectEntryDialog transaction={{ ...buy, transaction_type: 'sell', shares: -4 }} onClose={vi.fn()} />)
    expect(screen.getByLabelText(/Shares to sell/)).toHaveValue(4)
    expect(screen.getByLabelText(/Shares to sell/)).not.toHaveAttribute('max')
    preview()
    expect(entry(0)).toMatchObject({ transaction_type: 'sell', shares: -4 })
  })

  it('resends the exchange rate of a US entry', () => {
    render(<CorrectEntryDialog transaction={{ ...buy, currency: 'USD', fx_rate_to_cad: 1.31 }} onClose={vi.fn()} />)
    expect(screen.getByLabelText(/Exchange rate/)).toHaveValue(1.31)
    preview()
    expect(entry(0)).toMatchObject({ currency: 'USD', fx_rate_to_cad: 1.31 })
  })

  it('corrects a reinvestment (drip) as a trade with no fees and no reason', () => {
    render(<CorrectEntryDialog transaction={{ ...buy, transaction_type: 'drip', shares: 0.17, price_per_share: 100, total_amount: 17, fees: 0 }} onClose={vi.fn()} />)
    expect(screen.queryByLabelText(/Fees/)).not.toBeInTheDocument()
    preview()
    expect(entry(0)).toMatchObject({ transaction_type: 'drip', shares: 0.17, price_per_share: 100 })
  })
})

describe('CorrectEntryDialog: dividends and rows with no form', () => {

  it('corrects a manual dividend row: the gross and the tax, with no reinvestment section', () => {
    const dividend = row({ transaction_id: 't-div', transaction_type: 'dividend', account_type: 'rrsp', shares: null, price_per_share: null, total_amount: 20, withholding_tax: 3, fees: 0, currency: 'CAD', transaction_date: '2026-11-19T00:00:00' })
    render(<CorrectEntryDialog transaction={dividend} onClose={vi.fn()} />)
    expect(screen.queryByLabelText('Reinvested as new shares')).not.toBeInTheDocument()
    expect(screen.getByLabelText(/Dividend before tax/)).toHaveValue(20)
    expect(screen.getByLabelText(/Tax withheld/)).toHaveValue(3)
    fireEvent.change(screen.getByLabelText(/Dividend before tax/), { target: { value: '22' } })
    preview()
    expect(entry(0)).toMatchObject({ transaction_type: 'dividend', total_amount: 22, withholding_tax: 3, transaction_date: '2026-11-19' })
  })

  it('renders nothing for a row with no form (a transfer or an adjustment) or without a row', () => {
    const { container, rerender } = render(<CorrectEntryDialog transaction={{ ...buy, transaction_type: 'adjustment_in' }} onClose={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
    rerender(<CorrectEntryDialog transaction={null} onClose={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })
})
