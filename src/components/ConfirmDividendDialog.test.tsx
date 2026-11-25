import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ConfirmDividendDialog } from './ConfirmDividendDialog'
import { mapDividendEvent, type ApiDividendEvent } from '@/screens/portfolio/dividends'
import { mockLedgerHooks } from '@/test/ledger-mocks'
import dividendsFixture from '../../public/mock-data/portfolio/dividends.json'

vi.mock('@/hooks/use-portfolio')

let ledger: ReturnType<typeof mockLedgerHooks>
beforeEach(() => {
  ledger = mockLedgerHooks()
})

// A waiting dividend from the recorded API response.
const event = mapDividendEvent((dividendsFixture.data as unknown as ApiDividendEvent[]).find((e) => e.status === 'expected')!)
const set = (label: RegExp | string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } })
const body = () => ledger.calls.preview[0].body as Record<string, unknown>

describe('ConfirmDividendDialog', () => {
  it('renders nothing without an event', () => {
    const { container } = render(<ConfirmDividendDialog event={null} onClose={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('accepts the calculated dividend when nothing is typed: an empty body, shown with the calculated figures as hints', async () => {
    render(<ConfirmDividendDialog event={event} onClose={vi.fn()} />)
    expect(screen.getByLabelText(/Dividend before tax/)).toHaveAttribute('placeholder', String(event.expected_gross))
    fireEvent.click(screen.getByRole('button', { name: 'Review' }))
    expect(body()).toEqual({})
    expect(ledger.calls.preview[0].params).toEqual({ id: event.event_id })
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm dividend' }))
    await waitFor(() => expect(ledger.calls.record).toHaveLength(1))
    expect(ledger.calls.record[0].body).toEqual({})
  })

  it('sends only what was typed over', () => {
    render(<ConfirmDividendDialog event={event} onClose={vi.fn()} />)
    set(/Dividend before tax/, '50')
    fireEvent.click(screen.getByRole('button', { name: 'Review' }))
    expect(body()).toEqual({ gross: 50 })
  })

  it('offers reinvestment as a three-way choice and sends the explicit answer', () => {
    render(<ConfirmDividendDialog event={event} onClose={vi.fn()} />)
    expect(screen.getByLabelText('Reinvestment')).toHaveValue('default')
    set('Reinvestment', 'no')
    fireEvent.click(screen.getByRole('button', { name: 'Review' }))
    expect(body()).toEqual({ reinvest: false })
  })

  it('shows the reinvestment price, shares and day by default, because the account reinvests, and not when keeping cash', () => {
    render(<ConfirmDividendDialog event={event} onClose={vi.fn()} />)
    expect(screen.getByLabelText('Shares bought')).toBeInTheDocument()
    set('Reinvestment', 'no')
    expect(screen.queryByLabelText('Shares bought')).not.toBeInTheDocument()
    set('Reinvestment', 'yes')
    set(/Price per share/, '100')
    set('Shares bought', '0.4')
    set('Reinvestment date', '2026-11-23')
    fireEvent.click(screen.getByRole('button', { name: 'Review' }))
    expect(body()).toEqual({ reinvest: true, reinvest_price: 100, reinvest_shares: 0.4, reinvest_date: '2026-11-23' })
  })

  it('reinvests the whole net dividend at a typed price: the shares are worked out and sent with it', () => {
    render(<ConfirmDividendDialog event={event} onClose={vi.fn()} />)
    set('Reinvestment', 'yes')
    set(/Price per share/, '100')
    const shares = Math.round((event.expected_net / 100) * 1e6) / 1e6
    expect(screen.getByLabelText('Shares bought')).toHaveAttribute('placeholder', String(shares))
    fireEvent.click(screen.getByRole('button', { name: 'Review' }))
    expect(body()).toEqual({ reinvest: true, reinvest_price: 100, reinvest_shares: shares })
  })

  it("sends the shares typed over under the account's setting, without having to choose Reinvest", () => {
    render(<ConfirmDividendDialog event={event} onClose={vi.fn()} />)
    set(/Price per share/, '100')
    set('Shares bought', '0.4')
    fireEvent.click(screen.getByRole('button', { name: 'Review' }))
    expect(body()).toEqual({ reinvest_price: 100, reinvest_shares: 0.4 })
  })

  it('refuses tax above the dividend, saying why', () => {
    render(<ConfirmDividendDialog event={event} onClose={vi.fn()} />)
    set(/Dividend before tax/, '10')
    set(/Tax withheld/, '11')
    expect(screen.getByRole('alert')).toHaveTextContent('The tax withheld is more than the dividend')
    expect(screen.getByRole('button', { name: 'Review' })).toBeDisabled()
  })
})
