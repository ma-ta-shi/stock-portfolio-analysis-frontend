/** Home over the recorded activity feed, macro snapshot and exchange rates. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { Header } from '@/components/layout/Header'
import { installFixtureFetch } from '@/test/fixture-fetch'
import activityFile from '@/test/fixtures/home/activity.json'
import macroFile from '@/test/fixtures/market/macro.json'
import { HomePage } from './HomePage'

const portfolio = vi.hoisted(() => ({ portfolioId: 'p1', isEmpty: false, isError: false, error: undefined as Error | undefined, refetch: vi.fn() }))
vi.mock('@/hooks/use-portfolio-id', () => ({ usePortfolioId: () => portfolio }))
vi.mock('@/hooks/use-portfolio', () => ({ usePortfolioSummary: () => ({ data: undefined, isLoading: false, isError: false, refetch: vi.fn() }) }))
vi.mock('@/context/UserContext', () => ({ useUser: () => ({ userId: 'u1', setUserId: vi.fn() }) }))
vi.mock('@/components/layout/ProfileSwitcher', () => ({ ProfileSwitcher: () => null }))

const ACTIVITY = 'home/activity'
const MACRO = 'market/macro'

function show(ui = <HomePage />) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  )
}
const region = (name: string) => screen.getByRole('region', { name })
const item = activityFile.data[0]
const feed = (data: unknown[], total = data.length) => ({ data, meta: { ...activityFile.meta, total } })

beforeEach(() => installFixtureFetch())
afterEach(() => {
  vi.unstubAllGlobals()
  Object.assign(portfolio, { isEmpty: false, isError: false, error: undefined })
})

describe('What Changed', () => {
  it('shows the feed as cards that link into the app, with no news section', async () => {
    show()
    const cards = await within(region('What Changed')).findAllByRole('listitem')
    expect(cards).toHaveLength(Math.min(8, activityFile.data.length))
    expect(cards[0]).toHaveTextContent(item.title)
    expect(within(cards[0]).getByRole('link', { name: `View: ${item.title}` })).toHaveAttribute('href', item.action_url)
    expect(within(region('What Changed')).getAllByText('Needs you')).toHaveLength(activityFile.data.filter((i) => i.happened_at === null).length)
    expect(screen.queryByText('Market News')).not.toBeInTheDocument()
  })

  it('counts what does not fit, by kind, and points to the Portfolio when something there needs the user', async () => {
    const changes = Array.from({ length: 8 }, (_, i) => ({ ...item, ticker: `T${i}` }))
    const dividend = { ...item, type: 'dividend_waiting', happened_at: null, action_url: '/portfolio?tab=dividends' }
    installFixtureFetch({ [ACTIVITY]: feed([...changes, dividend, { ...dividend, ticker: 'B' }, { ...item, ticker: 'C' }]) })
    show()
    expect(await screen.findByText(/3 more: 2 dividends to confirm, 1 outlook change\./)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to Portfolio' })).toHaveAttribute('href', '/portfolio?tab=dividends')
  })

  it('shows a stock split as news, with nothing to do', async () => {
    const split = { ...item, type: 'stock_split', title: 'KO split 2-for-1', ticker: 'KO', action_url: '/portfolio' }
    installFixtureFetch({ [ACTIVITY]: feed([split]) })
    show()
    const card = await within(region('What Changed')).findByRole('listitem')
    expect(card).toHaveTextContent('KO split 2-for-1')
    expect(card).not.toHaveTextContent('Needs you')
    expect(within(card).getByRole('link')).toHaveAttribute('href', '/portfolio')
  })

  it.each(['https://example.com', '//example.com', '/admin?x=1'])('never links to %s', async (url) => {
    installFixtureFetch({ [ACTIVITY]: feed([{ ...item, action_url: url }]) })
    show()
    await within(region('What Changed')).findByRole('listitem')
    expect(within(region('What Changed')).queryByRole('link')).not.toBeInTheDocument()
  })

  it('says when nothing is new', async () => {
    installFixtureFetch({ [ACTIVITY]: feed([]) })
    show()
    expect(await screen.findByText('Nothing new in the last 7 days.')).toBeInTheDocument()
  })
})

describe('Market Overview', () => {
  it("shows the rates and VIX of the newest analysis and the Bank's exchange rate", async () => {
    show()
    const market = region('Market Overview')
    expect(await within(market).findByText(new RegExp('from the analysis of'))).toBeInTheDocument()
    expect(market).toHaveTextContent(`${macroFile.boc_rate.toFixed(2)}%`)
    expect(market).toHaveTextContent(`${macroFile.fed_funds_rate.toFixed(2)}%`)
    expect(market).toHaveTextContent(macroFile.vix.toFixed(2))
    expect(market).toHaveTextContent(macroFile.vix_regime)
    expect(within(market).getByLabelText('rising')).toBeInTheDocument()
    expect(market).toHaveTextContent(/CAD\/USD0\.\d{4}/)
  })

  it('says there are no rates before any analysis', async () => {
    const empty = Object.fromEntries(Object.keys(macroFile).map((k) => [k, null]))
    installFixtureFetch({ [MACRO]: empty })
    show()
    expect(await screen.findByText('No analysis on record yet, so no rates.')).toBeInTheDocument()
  })

  it('offers a retry when the rates cannot be read', async () => {
    installFixtureFetch({ [MACRO]: 500 })
    show()
    expect(await within(region('Market Overview')).findByRole('alert')).toHaveTextContent('rates')
  })
})

describe('the value bar and the header', () => {
  it('says there is no portfolio, or that it cannot be read, instead of showing nothing', () => {
    portfolio.isEmpty = true
    const first = show()
    expect(screen.getByText('You have no portfolio yet.')).toBeInTheDocument()
    first.unmount()
    Object.assign(portfolio, { isEmpty: false, isError: true, error: new Error('down') })
    show()
    expect(screen.getAllByRole('alert')[0]).toHaveTextContent('your portfolio')
  })

  it('shows the bell with no count', () => {
    show(<Header />)
    expect(screen.getByRole('img', { name: 'Notifications are not counted yet' })).toHaveTextContent('')
  })
})
