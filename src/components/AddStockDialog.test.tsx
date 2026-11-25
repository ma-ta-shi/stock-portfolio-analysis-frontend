import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AddStockDialog } from './AddStockDialog'
import type { TickerResult } from '@/hooks/use-ticker-search'
import { fromLookup } from '@/hooks/use-ticker-search'
import { mockLedgerHooks } from '@/test/ledger-mocks'
import type { StockLookup } from '@/screens/portfolio/lookup'

vi.mock('@/hooks/use-watchlist')
vi.mock('@/hooks/use-ticker-search', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/hooks/use-ticker-search')>()), useTickerSearch: vi.fn() }))
vi.mock('@/hooks/use-portfolio')
import { useAddToWatchlist, useWatchlist } from '@/hooks/use-watchlist'
import { useTickerSearch } from '@/hooks/use-ticker-search'

const usd: TickerResult = { stock_id: 'stk_msft', ticker: 'MSFT', name: 'Microsoft', sector: 'Technology', exchange: 'NASDAQ', currency: 'USD' }
const bnsLookup: StockLookup = {
  stock_id: null, ticker: 'BNS.TO', name: 'Bank of Nova Scotia', exchange: 'TSX', currency: 'CAD', sector: 'Financials',
  industry: 'Banks', instrument_type: null, pipeline_supported: true, unsupported_reason: null, source: 'provider',
} // fmt: skip
const search = vi.fn()
const mutation = (fn: ReturnType<typeof vi.fn>) => ({ mutateAsync: fn, isPending: false, isError: false, error: null, reset: vi.fn() }) as never
let ledger: ReturnType<typeof mockLedgerHooks>

beforeEach(() => {
  ledger = mockLedgerHooks()
  vi.mocked(useWatchlist).mockReturnValue({ data: undefined } as unknown as ReturnType<typeof useWatchlist>)
  vi.mocked(useAddToWatchlist).mockReturnValue(mutation(vi.fn()))
  vi.mocked(useTickerSearch).mockReturnValue(mutation(search))
  search.mockReset()
})

describe('AddStockDialog: finding the stock', () => {
  it('asks for a ticker only', () => {
    render(<AddStockDialog mode="portfolio" open onOpenChange={vi.fn()} />)
    expect(screen.getByLabelText('Ticker')).toBeInTheDocument()
  })

  it('shows what the lookup knows, in the registry fields', async () => {
    search.mockResolvedValue(fromLookup(bnsLookup))
    render(<AddStockDialog mode="portfolio" open onOpenChange={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Ticker'), { target: { value: 'bns.to' } })
    fireEvent.click(screen.getByRole('button', { name: 'Look up' }))
    expect(await screen.findByText('Bank of Nova Scotia')).toBeInTheDocument()
    expect(screen.getByText('Banks')).toBeInTheDocument()
    expect(screen.getByText('A data provider')).toBeInTheDocument()
  })

  it('says when nothing matches', async () => {
    search.mockResolvedValue(null)
    render(<AddStockDialog mode="portfolio" open onOpenChange={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Ticker'), { target: { value: 'ZZZZ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Look up' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No match found for')
  })

  it('reports a failed lookup', () => {
    vi.mocked(useTickerSearch).mockReturnValue({ mutateAsync: search, isPending: false, isError: true, error: new Error('Lookup service down'), reset: vi.fn() } as never)
    render(<AddStockDialog mode="portfolio" open onOpenChange={vi.fn()} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Lookup failed: Lookup service down')
  })

  it('does not fetch the watchlist in portfolio mode, only while open in watchlist mode', () => {
    const { rerender } = render(<AddStockDialog mode="portfolio" open onOpenChange={vi.fn()} defaultStock={usd} />)
    expect(vi.mocked(useWatchlist)).toHaveBeenLastCalledWith({ enabled: false })
    rerender(<AddStockDialog mode="watchlist" open={false} onOpenChange={vi.fn()} />)
    expect(vi.mocked(useWatchlist)).toHaveBeenLastCalledWith({ enabled: false })
    rerender(<AddStockDialog mode="watchlist" open onOpenChange={vi.fn()} />)
    expect(vi.mocked(useWatchlist)).toHaveBeenLastCalledWith({ enabled: true })
  })

  it('says an unsupported security is not analysed but can still be recorded', () => {
    render(<AddStockDialog mode="portfolio" open onOpenChange={vi.fn()} defaultStock={{ ...usd, pipeline_supported: false, unsupported_reason: 'a fund' }} />)
    expect(screen.getByRole('status')).toHaveTextContent('does not analyse this security (a fund). You can still record it.')
  })
})

// The original Add Stock form: shares, average cost and account.
describe('AddStockDialog: recording the position', () => {
  it('asks for the account, the shares and the average cost only', () => {
    render(<AddStockDialog mode="portfolio" open onOpenChange={vi.fn()} defaultStock={fromLookup({ ...bnsLookup, stock_id: 's1' })} />)
    expect(screen.getByLabelText('Account', { exact: true })).toBeInTheDocument()
    expect(screen.getByLabelText('Shares')).toBeInTheDocument()
    expect(screen.getByLabelText(/Avg cost \(CAD\)/)).toHaveValue(null)
    expect(screen.queryByLabelText(/Fees/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Reason/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Notes/)).not.toBeInTheDocument()
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
  })

  it('records an opening balance in the chosen account, as of today, with no fee', async () => {
    render(<AddStockDialog mode="portfolio" open onOpenChange={vi.fn()} defaultStock={fromLookup({ ...bnsLookup, stock_id: 's1' })} />)
    fireEvent.change(screen.getByLabelText('Account', { exact: true }), { target: { value: 'rrsp' } })
    fireEvent.change(screen.getByLabelText('Shares'), { target: { value: '5' } })
    fireEvent.change(screen.getByLabelText(/Avg cost/), { target: { value: '70' } })
    fireEvent.click(screen.getByRole('button', { name: 'Review' }))
    const row = (ledger.calls.preview[0].body as { events: Record<string, unknown>[] }).events[0]
    expect(row).toMatchObject({ account_type: 'rrsp', transaction_type: 'opening_balance', ticker: 'BNS.TO', shares: 5, price_per_share: 70, total_amount: 350, currency: 'CAD' })
    expect(row).not.toHaveProperty('fees')
    fireEvent.click(await screen.findByRole('button', { name: 'Add to Portfolio' }))
    await waitFor(() => expect(ledger.calls.record).toHaveLength(1))
  })

  it('needs the exchange rate for a US stock', () => {
    render(<AddStockDialog mode="portfolio" open onOpenChange={vi.fn()} defaultStock={usd} />)
    fireEvent.change(screen.getByLabelText('Shares'), { target: { value: '5' } })
    fireEvent.change(screen.getByLabelText(/Avg cost/), { target: { value: '300' } })
    expect(screen.getByRole('button', { name: 'Review' })).toBeDisabled()
    fireEvent.change(screen.getByLabelText(/Exchange rate/), { target: { value: '1.3' } })
    expect(screen.getByRole('button', { name: 'Review' })).toBeEnabled()
  })

  it('cannot hold a stock quoted in another currency', () => {
    render(<AddStockDialog mode="portfolio" open onOpenChange={vi.fn()} defaultStock={{ ...usd, currency: 'EUR' as TickerResult['currency'] }} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Only Canadian and US dollar stocks')
    fireEvent.change(screen.getByLabelText('Shares'), { target: { value: '5' } })
    fireEvent.change(screen.getByLabelText(/Avg cost/), { target: { value: '5' } })
    expect(screen.getByRole('button', { name: 'Review' })).toBeDisabled()
  })
})

describe('AddStockDialog: the watchlist', () => {
  it('adds the stock found', async () => {
    const add = vi.fn().mockResolvedValue(undefined)
    vi.mocked(useAddToWatchlist).mockReturnValue(mutation(add))
    const onOpenChange = vi.fn()
    render(<AddStockDialog mode="watchlist" open onOpenChange={onOpenChange} defaultStock={usd} />)
    fireEvent.click(screen.getByRole('button', { name: 'Add to Watchlist' }))
    await waitFor(() => expect(add).toHaveBeenCalledWith(usd))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
