import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { DividendsToConfirm } from './DividendsToConfirm'
import { ApiError } from '@/lib/api'
import { mapDividendEvent, type ApiDividendEvent, type DividendEvent } from '@/screens/portfolio/dividends'
import { mockLedgerHooks } from '@/test/ledger-mocks'
import dividendsFixture from '@/test/fixtures/portfolio/dividends.json'

vi.mock('@/hooks/use-portfolio')
import { useDividends } from '@/hooks/use-portfolio'

const fixture = (dividendsFixture.data as unknown as ApiDividendEvent[]).map(mapDividendEvent)
const waitingOne = fixture.find((e) => e.status === 'expected')!
// Dates far from today, so the rule "from the payment day" does not depend on when the test runs.
const payable: DividendEvent = { ...waitingOne, event_id: 'e-payable', payment_date: '2000-01-01', account_type: 'tfsa' }
const notYet: DividendEvent = { ...waitingOne, event_id: 'e-future', payment_date: '2999-01-01', account_type: 'trading' }
const confirmed: DividendEvent = { ...waitingOne, event_id: 'e-done', status: 'confirmed', account_type: 'tfsa' }

function show(data: DividendEvent[] | undefined, over: Record<string, unknown> = {}, account: 'combined' | 'tfsa' | 'rrsp' | 'trading' = 'combined') {
  vi.mocked(useDividends).mockReturnValue({ data, isError: false, ...over } as unknown as ReturnType<typeof useDividends>)
  return render(
    <MemoryRouter>
      <DividendsToConfirm accountFilter={account} />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  mockLedgerHooks()
})

describe('DividendsToConfirm', () => {
  it('says so when no dividend is waiting', () => {
    show([])
    expect(screen.getByText('No dividends waiting for you.')).toBeInTheDocument()
  })

  it('lists the dividends waiting for the owner with what they expect', () => {
    show([payable, notYet])
    expect(screen.getByRole('heading', { name: /Dividends waiting for you/ })).toHaveTextContent('(2)')
    expect(screen.getAllByRole('row')).toHaveLength(3) // the header and two dividends
    expect(screen.getAllByText(waitingOne.stock.ticker).length).toBeGreaterThan(0)
  })

  it('lets a paid dividend be confirmed and opens the confirmation', () => {
    show([payable])
    fireEvent.click(screen.getByRole('button', { name: /^Confirm .*dividend$/ }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Confirm dividend')
  })

  it('does not confirm a dividend before its payment day, and says when it pays', () => {
    show([notYet])
    expect(screen.getByRole('button', { name: /^Confirm .*dividend$/ })).toBeDisabled()
    expect(screen.getByText(/^Pays /)).toBeInTheDocument()
  })

  it('dismisses a waiting dividend, even one not paid yet', () => {
    show([notYet])
    fireEvent.click(screen.getByRole('button', { name: /^Dismiss .*dividend$/ }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Dismiss dividend')
  })

  it('narrows the list to the account the page shows', () => {
    show([payable, notYet], {}, 'trading')
    expect(screen.getByRole('heading', { name: /Dividends waiting for you/ })).toHaveTextContent('(1)')
  })

  it('keeps decided dividends behind a toggle and reopens one', () => {
    show([payable, confirmed])
    expect(screen.queryByRole('button', { name: /^Reopen/ })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Show decided dividends \(1\)/ }))
    const reopen = screen.getByRole('button', { name: /^Reopen .*dividend$/ })
    fireEvent.click(reopen)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent('Reopen dividend')
    expect(dialog).toHaveTextContent('reversed')
    expect(within(dialog).getByRole('button', { name: 'Reopen' })).toBeInTheDocument()
  })

  it('shows an error with retry when the dividends cannot be read', () => {
    const refetch = vi.fn()
    show(undefined, { isError: true, error: new ApiError('x', null, 'network_error', '/u'), refetch })
    expect(screen.getByRole('alert')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /retry/i }))
    expect(refetch).toHaveBeenCalled()
  })
})
