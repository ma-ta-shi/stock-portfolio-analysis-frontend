import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { StockPage } from './StockPage'
import { installFixtureFetch } from '@/test/fixture-fetch'
import { mockHolding } from '@/test/mock-data'
import { mockLedgerHooks } from '@/test/ledger-mocks'
import { mapTransactions } from '@/lib/portfolio-mappers'
import stockFile from '../../public/mock-data/stocks/stock.json'
import snapshotFile from '../../public/mock-data/stocks/snapshot.json'
import fundamentalsFile from '../../public/mock-data/stocks/fundamentals.json'
import transactionsFixture from '../../public/mock-data/portfolio/transactions.json'

vi.mock('@/hooks/use-portfolio')
vi.mock('@/hooks/use-ticker-search')
vi.mock('@/hooks/use-watchlist')
vi.mock('@/hooks/use-user-profile', () => ({ useUserProfile: () => ({ data: undefined, isLoading: false, isError: false }) }))
vi.mock('@/hooks/use-fx-rates', () => ({ useFxRates: () => ({ rates: { CAD: 1, USD: 1.4 }, isLoading: false }) }))
vi.mock('@/context/UserContext', () => ({
  UserProvider: ({ children }: { children: React.ReactNode }) => children,
  useUser: () => ({ userId: 'user_01', setUserId: vi.fn() }),
}))

import { usePortfolioHoldings, useTransactionHistory } from '@/hooks/use-portfolio'
import { useTickerSearch } from '@/hooks/use-ticker-search'
import { useWatchlist } from '@/hooks/use-watchlist'

// The page runs its real hooks and mappers over the recorded responses (the end-to-end seed's RY.TO).
const DIR = '/mock-data/stocks'
const holdings = vi.mocked(usePortfolioHoldings)
const ledger = vi.mocked(useTransactionHistory)

beforeEach(() => {
  mockLedgerHooks()
  holdings.mockReturnValue({ data: [] } as unknown as ReturnType<typeof usePortfolioHoldings>)
  ledger.mockReturnValue({ data: [], isError: false } as unknown as ReturnType<typeof useTransactionHistory>)
  vi.mocked(useTickerSearch).mockReturnValue({ mutateAsync: vi.fn(), isPending: false, reset: vi.fn() } as unknown as ReturnType<typeof useTickerSearch>)
  vi.mocked(useWatchlist).mockReturnValue({ data: undefined } as unknown as ReturnType<typeof useWatchlist>)
})
afterEach(() => vi.unstubAllGlobals())

function show(overrides: Record<string, unknown> = {}, stockId = stockFile.stock_id) {
  installFixtureFetch(overrides)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/stocks/${stockId}`]}>
        <Routes>
          <Route path="/stocks/:stockId" element={<StockPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const noAnalysis = {
  [`${DIR}/snapshot.json`]: { ...snapshotFile, data: [{ ...snapshotFile.data[0], analysis: null, status: 'excluded', exclusions: ['no_analysis'] }] },
  [`${DIR}/runs.json`]: { data: [], meta: { page: 1, per_page: 100, total: 0, pages: 1 } },
}

describe('StockPage: the latest call', () => {
  it('shows direction, tier and confidence, the target with its range, and a link to the analysis', async () => {
    show()
    const call = await screen.findByRole('region', { name: 'Latest call' })
    expect(call).toHaveTextContent('Bullish · Outperform')
    expect(call).toHaveTextContent('Target price (12 months)')
    expect(call).toHaveTextContent('$108.82')
    expect(call).toHaveTextContent('Range low (10th percentile)')
    expect(call).toHaveTextContent('Target and return are at the latest price.')
    expect(within(call).getByRole('link', { name: 'Full Analysis' })).toHaveAttribute('href', `/analysis/${snapshotFile.data[0].analysis.run_id}`)
    expect(within(call).queryByRole('link', { name: 'Analysis' })).not.toBeInTheDocument()
  })

  it("shows the run's drivers and summary, and says Layer 2 is unavailable", async () => {
    show()
    expect(await screen.findByText('Margin expansion')).toBeInTheDocument()
    expect(screen.getByText(/the margin trend outweighs the valuation/)).toBeInTheDocument()
    expect(screen.getByText(/unavailable \(S-2\)/)).toBeInTheDocument()
  })

  it('says a stock with no analysis at all is awaiting one', async () => {
    show(noAnalysis)
    expect(await screen.findByText('Awaiting analysis.')).toBeInTheDocument()
    expect(screen.getByText(/No analyses yet/)).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Latest call' })).not.toBeInTheDocument()
  })

  it('says why an unsupported security is not analysed, instead of awaiting', async () => {
    show({ ...noAnalysis, [`${DIR}/stock.json`]: { ...stockFile, pipeline_supported: false, unsupported_reason: 'an ETF or fund' } })
    expect(await screen.findByText('This security is not analysed: an ETF or fund.')).toBeInTheDocument()
    expect(screen.queryByText('Awaiting analysis.')).not.toBeInTheDocument()
  })
})

describe('StockPage: failed and unseen reads', () => {
  it('does not claim a stock was never analysed when its call cannot be read', async () => {
    show({ ...noAnalysis, [`${DIR}/snapshot.json`]: 500 })
    expect(await screen.findByText(/price and latest call/i)).toBeInTheDocument()
    await screen.findByText(/No analyses yet/)
    expect(screen.queryByText('Awaiting analysis.')).not.toBeInTheDocument()
  })

  // The seed stores no data bundle, so the fundamentals are built by hand to the API's shape.
  it('draws the fundamentals the API serves, with the market cap in the stock currency and the day they are from', async () => {
    show({
      [`${DIR}/fundamentals.json`]: {
        ...fundamentalsFile,
        run_id: 'r',
        run_day: '2026-11-20',
        valuation: { pe_ratio: 12.5, forward_pe: 11, pb_ratio: 1.8, ps_ratio: 3, peg_ratio: null, ev_ebitda: null },
        price: { current_price: 100, market_cap: 2e11, currency: 'USD', high_52w: 120, low_52w: 80 },
        dividend: { dividend_yield: 0.035, payout_ratio: null },
      },
    })
    expect((await screen.findByText('P/E')).nextSibling).toHaveTextContent('12.5')
    expect(screen.getByText('EV/EBITDA').nextSibling).toHaveTextContent('—')
    expect(screen.getByText('Div Yield').nextSibling).toHaveTextContent('3.50%')
    expect(screen.getByText('52-Week Range')).toBeInTheDocument()
    expect(screen.getByText(/Mkt cap/)).toHaveTextContent('US$')
    expect(screen.getByText('Fundamentals as of Nov 20, 2026')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'More fundamentals' }))
    expect(screen.getByText('P/B').nextSibling).toHaveTextContent('1.8')
  })
})

describe('StockPage: the analysis history', () => {
  it('lists the past analyses with the price, the prediction and its return, and the account unavailable', async () => {
    show()
    const table = await screen.findByRole('table')
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('unavailable (S-3)')
    expect(rows[1]).toHaveTextContent('$95.00')
    expect(rows[1]).toHaveTextContent('Resolved')
    expect(rows[1]).toHaveTextContent('+6.4%') // the 3 month result, not the 1 month one
    fireEvent.click(within(rows[0]).getByRole('button', { name: /Show details/ }))
    expect(screen.getByText('Expected return range')).toBeInTheDocument()
    expect(screen.getByText('-12.00% to +31.00%')).toBeInTheDocument()
  })

  it('keeps Run New Analysis disabled and says why', async () => {
    show()
    const button = await screen.findByRole('button', { name: 'Run New Analysis' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('title', expect.stringContaining('S-4'))
  })
})

describe('StockPage: states', () => {
  it('says a stock that does not exist was not found', async () => {
    show({ [`${DIR}/stock.json`]: 404 })
    expect(await screen.findByText('Stock not found.')).toBeInTheDocument()
  })

  it('offers a retry when the stock cannot be read', async () => {
    show({ [`${DIR}/stock.json`]: 500 })
    expect(await screen.findByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('keeps the page when only the price history fails', async () => {
    show({ [`${DIR}/prices.json`]: 500 })
    expect(await screen.findByText(/price history/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Analysis History' })).toBeInTheDocument()
  })
})

describe('StockPage: your position and its history', () => {
  const transactions = mapTransactions(transactionsFixture.data as unknown as Parameters<typeof mapTransactions>[0])

  it('offers Buy, Sell, Log Dividend and Edit for a holding of this stock', async () => {
    holdings.mockReturnValue({ data: [{ ...mockHolding, stock: { ...mockHolding.stock, stock_id: stockFile.stock_id } }] } as unknown as ReturnType<typeof usePortfolioHoldings>)
    show()
    for (const name of ['Buy', 'Sell', 'Log Dividend', 'Edit']) {
      expect(await screen.findByRole('button', { name })).toBeInTheDocument()
    }
  })

  it("lists that stock's transactions and dividends together, and no other stock's", async () => {
    const mine = { ...transactions[0], transaction_id: 'mine', stock: { ...transactions[0].stock!, ticker: 'RY.TO' } }
    const other = { ...transactions[0], transaction_id: 'other', stock: { ...transactions[0].stock!, ticker: 'ENB.TO' } }
    ledger.mockReturnValue({ data: [mine, { ...mine, transaction_id: 'div', transaction_type: 'dividend' }, other], isError: false } as unknown as ReturnType<typeof useTransactionHistory>)
    show()
    const section = await screen.findByRole('region', { name: 'Transactions and dividends' })
    expect(section.querySelectorAll('tbody tr')).toHaveLength(2)
  })
})
