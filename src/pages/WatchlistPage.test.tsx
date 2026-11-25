import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { WatchlistPage } from './WatchlistPage'
import { ApiError } from '@/lib/api'
import { mapWatchlistEntry, type ApiWatchlistEntry } from '@/lib/watchlist'
import type { WatchlistItem } from '@/types/watchlist'
import recorded from '../../public/mock-data/watchlist/watchlist.json'

vi.mock('@/hooks/use-watchlist')
vi.mock('@/hooks/use-ticker-search')
vi.mock('@/hooks/use-portfolio')
import { useAddToWatchlist, useRemoveFromWatchlist, useWatchlist } from '@/hooks/use-watchlist'
import { useTickerSearch } from '@/hooks/use-ticker-search'

const items = (recorded.data as unknown as ApiWatchlistEntry[]).map(mapWatchlistEntry)
const removeMutate = vi.fn()
const searchMutate = vi.fn()
const addMutate = vi.fn()
const mutation = (mutateAsync: ReturnType<typeof vi.fn>, over: Record<string, unknown> = {}) =>
  ({ mutateAsync, isPending: false, isError: false, error: null, reset: vi.fn(), ...over }) as never

function show(data: WatchlistItem[] | undefined = items, over: Record<string, unknown> = {}) {
  vi.mocked(useWatchlist).mockReturnValue({ data, isLoading: false, isError: false, ...over } as unknown as ReturnType<typeof useWatchlist>)
  return render(
    <MemoryRouter>
      <WatchlistPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.mocked(useRemoveFromWatchlist).mockReturnValue(mutation(removeMutate))
  vi.mocked(useAddToWatchlist).mockReturnValue(mutation(addMutate))
  vi.mocked(useTickerSearch).mockReturnValue(mutation(searchMutate))
  removeMutate.mockReset().mockResolvedValue(undefined)
  searchMutate.mockReset()
  addMutate.mockReset().mockResolvedValue(undefined)
})

const row = (ticker: string) => screen.getByRole('row', { name: `View ${ticker}` })
const tickers = () => screen.getAllByRole('row', { name: /^View / }).map((r) => r.getAttribute('aria-label')!.slice(5))

describe('WatchlistPage: the table', () => {
  it('has the columns of the original design, in order', () => {
    show()
    const headers = screen.getAllByRole('columnheader').map((h) => h.textContent)
    expect(headers).toEqual(['Details', 'Stock', 'Sector', 'Price', 'Day Δ', 'Outlook', 'Confidence', 'Disagreement', 'Proj. Return', 'Portfolio Fit', 'Account', 'Last Analyzed', 'Actions'])
  })

  it('counts the stocks in the header', () => {
    show()
    expect(screen.getByText('3 stocks')).toBeInTheDocument()
    expect(screen.getByText('2 bullish')).toBeInTheDocument()
    expect(screen.getByText('1 awaiting analysis')).toBeInTheDocument()
    expect(screen.queryByText(/changed$/)).not.toBeInTheDocument()
  })

  it('shows the call as plain text, the direction with the tier, and no warning when it can be used', () => {
    show()
    expect(row('RY.TO')).toHaveTextContent('Bullish · Outperform')
    expect(within(row('RY.TO')).queryByText('Analysis is out of date')).not.toBeInTheDocument()
  })

  it('warns on a call that cannot be used, with the reason in words', () => {
    show()
    expect(within(row('TD.TO')).getByText('Analysis is out of date')).toHaveClass('sr-only')
  })

  it('says a stock with no analysis is awaiting one, with dashes and no invented figures', () => {
    show()
    expect(within(row('MSFT')).getByText('Awaiting analysis')).toBeInTheDocument()
    expect(within(row('MSFT')).getByText('Not yet')).toBeInTheDocument()
    expect(within(row('MSFT')).queryByText(/%/)).not.toBeInTheDocument()
  })

  it('shows a dash, not "Awaiting analysis", for a stock that can no longer be analysed', () => {
    const msft = items.find((i) => i.stock.ticker === 'MSFT')!
    show([{ ...msft, stock: { ...msft.stock, pipeline_supported: false, unsupported_reason: 'a fund' } }])
    expect(within(row('MSFT')).getByText('Unsupported')).toBeInTheDocument()
    expect(within(row('MSFT')).queryByText('Awaiting analysis')).not.toBeInTheDocument()
    expect(screen.queryByText(/awaiting analysis$/)).not.toBeInTheDocument()
  })

  it('says Portfolio Fit and Account are unavailable, citing their gaps', () => {
    show()
    expect(within(row('RY.TO')).getByText('unavailable (W-1)')).toBeInTheDocument()
    expect(within(row('RY.TO')).getByText('unavailable (W-2)')).toBeInTheDocument()
  })

  it('sorts by projected return first, with stocks that have none last, and by a clicked column', () => {
    const ry = items.find((i) => i.stock.ticker === 'RY.TO')!
    const lower = { ...ry, watchlist_id: 'low', stock: { ...ry.stock, ticker: 'LOW.TO' }, call: { ...ry.call!, analysis: { ...ry.call!.analysis!, expectedReturn: 0.01, confidence: 99 } } }
    show([items.find((i) => i.stock.ticker === 'MSFT')!, lower, ry])
    expect(tickers()).toEqual(['RY.TO', 'LOW.TO', 'MSFT'])
    fireEvent.click(screen.getByRole('button', { name: 'Confidence' }))
    expect(tickers()).toEqual(['LOW.TO', 'RY.TO', 'MSFT'])
    expect(screen.getByRole('columnheader', { name: 'Confidence' })).toHaveAttribute('aria-sort', 'descending')
    fireEvent.click(screen.getByRole('button', { name: 'Confidence' }))
    expect(tickers()).toEqual(['RY.TO', 'LOW.TO', 'MSFT'])
  })

  it('shows what else the API knows when a row is expanded', () => {
    show()
    expect(screen.queryByText('Why not usable')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Show details of TD.TO' }))
    for (const label of ['Why not usable', 'Change (week)', 'Tier', 'Notes', 'Added']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it('shows an error with retry when the list cannot be read', () => {
    const refetch = vi.fn()
    show(undefined, { isError: true, error: new ApiError('x', null, 'network_error', '/u'), refetch })
    fireEvent.click(screen.getByRole('button', { name: /retry/i }))
    expect(refetch).toHaveBeenCalled()
  })

  it('offers to add the first stock when the list is empty', () => {
    show([])
    fireEvent.click(screen.getByRole('button', { name: 'Add your first stock' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Add to Watchlist')
  })
})

describe('WatchlistPage: remove', () => {
  const open = () => fireEvent.click(screen.getByRole('button', { name: 'Remove TD.TO from watchlist' }))
  const td = items.find((i) => i.stock.ticker === 'TD.TO')!

  it('asks for confirmation, then removes', async () => {
    show()
    open()
    expect(screen.getByRole('dialog')).toHaveTextContent('Remove TD.TO (Toronto-Dominion Bank) from your watchlist?')
    expect(removeMutate).not.toHaveBeenCalled()
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Remove' }))
    await waitFor(() => expect(removeMutate).toHaveBeenCalledWith(td.watchlist_id))
  })

  it('does nothing when cancelled', () => {
    show()
    open()
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }))
    expect(removeMutate).not.toHaveBeenCalled()
  })

  it("shows the server's refusal in the dialog", () => {
    vi.mocked(useRemoveFromWatchlist).mockReturnValue(mutation(removeMutate, { isError: true, error: new ApiError('That entry is gone', 404, 'not_found', '/u') }))
    show()
    open()
    expect(within(screen.getByRole('dialog')).getByRole('alert')).toHaveTextContent('That entry is gone')
  })
})

describe('WatchlistPage: add', () => {
  async function lookUp(ticker: string) {
    searchMutate.mockResolvedValue({ stock_id: ticker, ticker, name: `${ticker} Corp`, sector: 'Financials', exchange: 'TSX', currency: 'CAD' })
    show()
    fireEvent.click(screen.getByRole('button', { name: 'Add Stock' }))
    fireEvent.change(screen.getByLabelText('Ticker'), { target: { value: ticker } })
    fireEvent.click(screen.getByRole('button', { name: 'Look up' }))
    await waitFor(() => expect(searchMutate).toHaveBeenCalled())
  }

  it('adds a stock that is not on the watchlist, by its ticker', async () => {
    await lookUp('BNS.TO')
    fireEvent.click(await screen.findByRole('button', { name: 'Add to Watchlist' }))
    await waitFor(() => expect(addMutate).toHaveBeenCalledWith('BNS.TO'))
  })

  it('blocks a ticker that is already watched, even when its lookup carries no id', async () => {
    await lookUp('TD.TO')
    expect(await screen.findByText('TD.TO is already on your watchlist.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add to Watchlist' })).toBeDisabled()
  })
})
