import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { WatchlistPage } from './WatchlistPage'
import type { WatchlistItem, WatchlistResponse } from '@/types'

vi.mock('@/hooks/use-watchlist')
vi.mock('@/hooks/use-ticker-search')
vi.mock('@/hooks/use-portfolio')
import { useAddToWatchlist, useRemoveFromWatchlist, useWatchlist } from '@/hooks/use-watchlist'
import { useTickerSearch } from '@/hooks/use-ticker-search'
import { useAddToPortfolio } from '@/hooks/use-portfolio'

const item = (id: string, ticker: string, stockId: string): WatchlistItem => ({
  watchlist_id: id, user_id: 'user_01',
  stock: { stock_id: stockId, ticker, name: `${ticker} Corp`, sector: 'Financials', exchange: 'TSX', currency: 'CAD' },
  current_price: 100, day_change: 1, day_change_pct: 0.01, week_change_pct: 0, month_change_pct: 0,
  stock_outlook: 'bullish', projected_return_pct: 0.1, portfolio_fit: 'strong_candidate',
  confidence_score: 70, disagreement_score: 0.1, disagreement_label: 'low', suggested_account: 'tfsa',
  last_analyzed_at: '2026-03-01T00:00:00Z', added_at: '2026-01-01T00:00:00Z',
})
const watchlist: WatchlistResponse = {
  data: [item('wl_1', 'TD.TO', 'stk_td_to'), item('wl_2', 'BMO.TO', 'stk_bmo_to')],
  summary: { total: 2, bullish_count: 2, changed_since_last_check: 0 },
}

const removeMutate = vi.fn()
const searchMutate = vi.fn()
const addMutate = vi.fn()
const mutation = (mutateAsync: ReturnType<typeof vi.fn>) =>
  ({ mutateAsync, isPending: false, isError: false, error: null, reset: vi.fn() }) as never

beforeEach(() => {
  vi.mocked(useWatchlist).mockReturnValue({ data: watchlist, isLoading: false, isError: false } as unknown as ReturnType<typeof useWatchlist>)
  vi.mocked(useRemoveFromWatchlist).mockReturnValue(mutation(removeMutate))
  vi.mocked(useAddToWatchlist).mockReturnValue(mutation(addMutate))
  vi.mocked(useTickerSearch).mockReturnValue(mutation(searchMutate))
  vi.mocked(useAddToPortfolio).mockReturnValue(mutation(vi.fn()))
  removeMutate.mockReset().mockResolvedValue(undefined)
  searchMutate.mockReset()
  addMutate.mockReset().mockResolvedValue(undefined)
})

const renderPage = () => render(<MemoryRouter><WatchlistPage /></MemoryRouter>)

describe('WatchlistPage — remove', () => {
  it('asks for confirmation, then removes', async () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Remove TD.TO from watchlist' }))
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent('Remove TD.TO (TD.TO Corp) from your watchlist?')
    expect(removeMutate).not.toHaveBeenCalled()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Remove' }))
    await waitFor(() => expect(removeMutate).toHaveBeenCalledWith('wl_1'))
  })

  it('does nothing when cancelled', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Remove TD.TO from watchlist' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }))
    expect(removeMutate).not.toHaveBeenCalled()
  })
})

describe('WatchlistPage — add', () => {
  async function lookUp(result: unknown) {
    searchMutate.mockResolvedValue(result)
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Add Stock' }))
    fireEvent.change(screen.getByLabelText('Ticker or company name'), { target: { value: 'x' } })
    fireEvent.click(screen.getByRole('button', { name: 'Look up' }))
    await waitFor(() => expect(searchMutate).toHaveBeenCalled())
  }

  it('adds a stock that is not on the watchlist', async () => {
    const ry = { stock_id: 'stk_ry_to', ticker: 'RY.TO', name: 'Royal Bank', sector: 'Financials', exchange: 'TSX', currency: 'CAD' }
    await lookUp(ry)
    fireEvent.click(await screen.findByRole('button', { name: 'Add to Watchlist' }))
    await waitFor(() => expect(addMutate).toHaveBeenCalledWith(ry))
  })

  it('blocks adding a stock that is already on the watchlist', async () => {
    await lookUp({ stock_id: 'stk_td_to', ticker: 'TD.TO', name: 'TD', sector: 'Financials', exchange: 'TSX', currency: 'CAD' })
    expect(await screen.findByText('TD.TO is already on your watchlist.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add to Watchlist' })).toBeDisabled()
  })
})

describe('WatchlistPage — empty', () => {
  it('offers to add the first stock', () => {
    vi.mocked(useWatchlist).mockReturnValue({ data: { ...watchlist, data: [] }, isLoading: false, isError: false } as unknown as ReturnType<typeof useWatchlist>)
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Add your first stock' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Add to Watchlist')
  })
})
