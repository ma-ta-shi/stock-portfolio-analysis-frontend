import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { DividendsTab } from './DividendsTab'
import { localDateInputValue } from '@/lib/format'
import { mapDividendEvent, type ApiDividendEvent, type DividendEvent } from '@/screens/portfolio/dividends'
import { mockLedgerHooks } from '@/test/ledger-mocks'
import { mapTransactions } from '@/lib/portfolio-mappers'
import transactionsFixture from '../../../public/mock-data/portfolio/transactions.json'
import dividendsFixture from '../../../public/mock-data/portfolio/dividends.json'

vi.mock('@/hooks/use-portfolio')
vi.mock('@/hooks/use-fx-rates', () => ({ useFxRates: () => ({ rates: { CAD: 1, USD: 1.4 }, isLoading: false }) }))
import { useDividends, useDividendsReceived, useTransactionHistory } from '@/hooks/use-portfolio'

const base = mapDividendEvent((dividendsFixture.data as unknown as ApiDividendEvent[]).find((e) => e.status === 'expected')!)
const inDays = (n: number) => localDateInputValue(new Date(Date.now() + n * 86_400_000))
const event = (id: string, days: number, net: number, currency: 'CAD' | 'USD' = 'CAD'): DividendEvent => ({
  ...base, event_id: id, payment_date: inDays(days), expected_net: net, currency, account_type: 'tfsa',
}) // fmt: skip

const transactions = mapTransactions(transactionsFixture.data as unknown as Parameters<typeof mapTransactions>[0])
// One dividend row beside the recorded rows, whatever the recording holds.
const mixed = [...transactions, { ...transactions[0], transaction_id: 'd1', transaction_type: 'dividend' as const }]

function show(events: DividendEvent[], history = mixed) {
  vi.mocked(useDividends).mockReturnValue({ data: events, isError: false } as unknown as ReturnType<typeof useDividends>)
  vi.mocked(useDividendsReceived).mockReturnValue({ data: 12.5, isError: false })
  vi.mocked(useTransactionHistory).mockReturnValue({ data: history, isError: false } as unknown as ReturnType<typeof useTransactionHistory>)
  render(
    <MemoryRouter>
      <DividendsTab />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  mockLedgerHooks()
})

describe('DividendsTab', () => {
  it('shows what was received, and what pays within 30 days in Canadian dollars', () => {
    show([event('soon', 5, 10), event('us', 20, 10, 'USD'), event('later', 45, 100), event('past', -3, 1000)])
    expect(screen.getByText('Dividends received (past 30 days)').nextSibling).toHaveTextContent('$12.50')
    expect(screen.getByText('Dividends expected (next 30 days)').nextSibling).toHaveTextContent('$24.00')
  })

  it('lists only dividend and reinvestment rows in the history', () => {
    const dividends = mixed.filter((t) => t.transaction_type === 'dividend' || t.transaction_type === 'drip')
    expect(dividends.length).toBeLessThan(mixed.length)
    show([])
    const history = screen.getByRole('region', { name: 'Dividend history' })
    expect(history.querySelectorAll('tbody tr')).toHaveLength(dividends.length)
  })
})
