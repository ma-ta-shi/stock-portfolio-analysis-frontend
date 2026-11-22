import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AddStockDialog } from './AddStockDialog'
import type { TickerResult } from '@/hooks/use-ticker-search'

vi.mock('@/hooks/use-watchlist')
vi.mock('@/hooks/use-ticker-search')
vi.mock('@/hooks/use-portfolio')
import { useAddToWatchlist, useWatchlist } from '@/hooks/use-watchlist'
import { useTickerSearch } from '@/hooks/use-ticker-search'
import { useAddToPortfolio } from '@/hooks/use-portfolio'

const usd: TickerResult = { stock_id: 'stk_msft', ticker: 'MSFT', name: 'Microsoft', sector: 'Technology', exchange: 'NASDAQ', currency: 'USD' }
const addPortfolio = vi.fn()
const search = vi.fn()
const mutation = (fn: ReturnType<typeof vi.fn>) => ({ mutateAsync: fn, isPending: false, isError: false, error: null, reset: vi.fn() }) as never

beforeEach(() => {
  vi.mocked(useWatchlist).mockReturnValue({ data: undefined } as unknown as ReturnType<typeof useWatchlist>)
  vi.mocked(useAddToWatchlist).mockReturnValue(mutation(vi.fn()))
  vi.mocked(useTickerSearch).mockReturnValue(mutation(search))
  vi.mocked(useAddToPortfolio).mockReturnValue(mutation(addPortfolio))
  addPortfolio.mockReset().mockResolvedValue(undefined)
  search.mockReset()
})

describe('AddStockDialog — portfolio mode', () => {
  it('does not fetch the watchlist (only needed for the watchlist duplicate check)', () => {
    render(<AddStockDialog mode="portfolio" open onOpenChange={vi.fn()} defaultStock={usd} />)
    expect(vi.mocked(useWatchlist)).toHaveBeenCalledWith({ enabled: false })
  })

  it('fetches the watchlist only while open in watchlist mode', () => {
    const { rerender } = render(<AddStockDialog mode="watchlist" open={false} onOpenChange={vi.fn()} />)
    expect(vi.mocked(useWatchlist)).toHaveBeenLastCalledWith({ enabled: false })
    rerender(<AddStockDialog mode="watchlist" open onOpenChange={vi.fn()} />)
    expect(vi.mocked(useWatchlist)).toHaveBeenLastCalledWith({ enabled: true })
  })

  it('labels the cost in the stock’s currency and shows the book cost in it', () => {
    render(<AddStockDialog mode="portfolio" open onOpenChange={vi.fn()} defaultStock={usd} />)
    fireEvent.change(screen.getByLabelText('Shares'), { target: { value: '10' } })
    fireEvent.change(screen.getByLabelText('Avg cost (USD)'), { target: { value: '400' } })
    expect(screen.getByText('Book cost: US$4,000.00')).toBeInTheDocument()
  })

  it('requires shares and cost before adding', () => {
    render(<AddStockDialog mode="portfolio" open onOpenChange={vi.fn()} defaultStock={usd} />)
    const add = screen.getByRole('button', { name: 'Add to Portfolio' })
    expect(add).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Shares'), { target: { value: '10' } })
    expect(add).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Avg cost (USD)'), { target: { value: '400' } })
    expect(add).toBeEnabled()
  })

  it('submits the position to the chosen account and closes', async () => {
    const onOpenChange = vi.fn()
    render(<AddStockDialog mode="portfolio" open onOpenChange={onOpenChange} defaultStock={usd} />)
    fireEvent.change(screen.getByLabelText('Shares'), { target: { value: '10' } })
    fireEvent.change(screen.getByLabelText('Avg cost (USD)'), { target: { value: '400' } })
    fireEvent.change(screen.getByLabelText('Account'), { target: { value: 'rrsp' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add to Portfolio' }))
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
    expect(addPortfolio).toHaveBeenCalledWith({ stock: usd, shares: 10, average_cost_basis: 400, account_type: 'rrsp' })
  })

  it('stays open and shows the error if adding fails', async () => {
    addPortfolio.mockRejectedValueOnce(new Error('nope'))
    vi.mocked(useAddToPortfolio).mockReturnValue({ mutateAsync: addPortfolio, isPending: false, isError: true, error: new Error('Server said no'), reset: vi.fn() } as never)
    const onOpenChange = vi.fn()
    render(<AddStockDialog mode="portfolio" open onOpenChange={onOpenChange} defaultStock={usd} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Server said no')
    fireEvent.change(screen.getByLabelText('Shares'), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText('Avg cost (USD)'), { target: { value: '1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add to Portfolio' }))
    await waitFor(() => expect(addPortfolio).toHaveBeenCalled())
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
  })

  it('reports a failed lookup', async () => {
    search.mockRejectedValueOnce(new Error('down'))
    vi.mocked(useTickerSearch).mockReturnValue({ mutateAsync: search, isPending: false, isError: true, error: new Error('Lookup service down'), reset: vi.fn() } as never)
    render(<AddStockDialog mode="portfolio" open onOpenChange={vi.fn()} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Lookup failed: Lookup service down')
  })
})
