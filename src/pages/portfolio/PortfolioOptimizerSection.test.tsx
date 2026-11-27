/** The Optimizer tab and the "Available to trade" answer, over a recorded run and a recorded answer. */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ApiError } from '@/lib/api'
import { noOrdersMessage, runSteps, type Order, type Run } from '@/lib/optimizer'
import askFixture from '@/test/fixtures/portfolio/ask.json'
import fixture from '@/test/fixtures/portfolio/proposals.json'
import { AvailableToTrade } from './AvailableToTrade'
import { OptimizerRun } from './OptimizerRun'
import { PortfolioOptimizerSection } from './PortfolioOptimizerSection'

const api = vi.hoisted(() => ({ apiFetch: vi.fn(), apiQuery: vi.fn() }))
vi.mock('@/lib/api', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/api')>()), ...api }))
vi.mock('@/hooks/use-portfolio-id', () => ({ usePortfolioId: () => ({ portfolioId: 'p1' }) }))

const recorded = fixture as unknown as Run
const base = recorded.orders[0]
const order = (over: Partial<Order>): Order => ({ ...base, ...over })
const run = (over: Partial<Run>): Run => ({ ...recorded, orders: [], transfers: [], waiting: [], drift: [], warnings: [], missing: [], ...over })

const wrap = (ui: React.ReactNode) =>
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>)
const card = (name: RegExp) => screen.getByRole('article', { name })

afterEach(() => vi.resetAllMocks())

describe('runSteps', () => {
  const sell = order({ sequence: 1, side: 'sell', account: 'trading', chain: 'relocate:tfsa' })
  const move = order({ sequence: 2, kind: 'transfer', side: 'transfer', account: 'trading', to_account: 'tfsa', ticker: null, chain: 'relocate:tfsa' })
  const other = order({ sequence: 3, account: 'rrsp', chain: null })
  const r = run({ orders: [other, sell], transfers: [move] })

  it('groups the linked steps in order and keeps a group whole under either of its accounts', () => {
    expect(runSteps(r).linked.map((g) => g.map((s) => s.order.sequence))).toEqual([[1, 2]])
    expect(runSteps(r).single.map((s) => s.order.sequence)).toEqual([3])
    expect(runSteps(r, 'tfsa').linked[0]).toHaveLength(2)
    expect(runSteps(r, 'tfsa').single).toEqual([])
    expect(runSteps(r, 'rrsp').linked).toEqual([])
  })

  it('drops the analysis note, and what is built from it, when it predates the price band', () => {
    const old = order({ view: { ...base.view!, exclusions: ['run_predates_band'] }, what_would_change: ['Your TFSA room changes'] })
    const [step] = runSteps(run({ orders: [old] })).single
    expect(step.note).toBeNull()
    expect(step.whatWouldChange).toEqual([])
  })
})

describe('noOrdersMessage', () => {
  const quiet = (over: Partial<Run>) => run({ no_changes: true, report: { ...recorded.report!, excluded: [] }, ...over })

  it('claims "well-positioned" only when nothing waits and nothing was left out', () => {
    expect(noOrdersMessage(quiet({}))).toMatch(/well-positioned/)
    expect(noOrdersMessage(quiet({ waiting: recorded.waiting }))).toBe('No orders to place now; what is waiting is listed below.')
    expect(noOrdersMessage(quiet({ report: recorded.report }))).toMatch(/^No changes suggested. Left out .*KO/)
    expect(noOrdersMessage(quiet({ transfers: [base] }))).toBeNull()
    expect(noOrdersMessage(recorded)).toBeNull()
  })
})

describe('OptimizerRun', () => {
  it('draws every recorded order and waiting item, with held and target only where the run has them', () => {
    render(<OptimizerRun run={recorded} view="combined" />)
    expect(screen.getAllByRole('article')).toHaveLength(recorded.orders.length + recorded.transfers.length)
    expect(within(screen.getByRole('region', { name: 'Waiting' })).getAllByRole('listitem')).toHaveLength(recorded.waiting.length)
    const matched = recorded.orders.filter((o) => recorded.drift.some((d) => d.account === o.account && d.ticker === o.ticker))
    expect(screen.queryAllByText(/held, target/)).toHaveLength(matched.length)
    expect(screen.queryByText(/confidence/)).not.toBeInTheDocument()
  })

  it('draws a sale, a move and the rebuy date, and says why an analysis is not usable', () => {
    const sale = order({ sequence: 1, side: 'sell', ticker: 'AAA', amount_cad: 100, rebuy_not_before: '2026-12-21', view: { ...base.view!, exclusions: ['stale'] } })
    const move = order({ sequence: 2, side: 'transfer', ticker: null, account: 'trading', to_account: 'tfsa', amount_cad: 100, shares: null, view: null })
    render(<OptimizerRun run={run({ orders: [sale], transfers: [move] })} view="combined" />)
    expect(card(/^Sell \$100\.00 AAA$/)).toHaveTextContent('Do not rebuy before')
    expect(card(/AAA/)).toHaveTextContent('Analysis not usable')
    expect(card(/^Move \$100\.00 Cash$/)).toHaveTextContent('TRADING to TFSA')
  })

  it('keeps a whole-portfolio wait under every account, and does not call it cash', () => {
    render(<OptimizerRun run={recorded} view="tfsa" />)
    const waiting = screen.getByRole('region', { name: 'Waiting' })
    expect(waiting).toHaveTextContent('Sell TD.TO $1,450.00 (whole portfolio)')
    expect(waiting).not.toHaveTextContent('RY.TO (RRSP)')
  })

  it('opens the details of a card', () => {
    render(<OptimizerRun run={run({ orders: [base] })} view="combined" />)
    expect(screen.queryByText('Commission')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Show details/ }))
    expect(screen.getByText('Commission')).toBeInTheDocument()
  })

  it('says when nothing is proposed, when the run is dry, and what it did not keep', () => {
    render(<OptimizerRun run={run({ no_changes: true, dry_run: true, report: undefined, warnings: ['No price for X'], missing: ['target_book'] })} view="combined" />)
    expect(screen.getByText(/no changes suggested/)).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('not a basis for orders')
    const warnings = screen.getByRole('region', { name: 'Warnings' })
    expect(warnings).toHaveTextContent('No price for X')
    expect(warnings).toHaveTextContent('This run did not keep: target book')
  })
})

describe('PortfolioOptimizerSection', () => {
  it('shows the stored run', async () => {
    api.apiFetch.mockResolvedValue(recorded)
    wrap(<PortfolioOptimizerSection />)
    expect(await screen.findByText(recorded.headline)).toBeInTheDocument()
    expect(screen.getByText(/^Run of .*weekly run/)).toBeInTheDocument()
  })

  it('treats a portfolio with no run as an empty state, not an error', async () => {
    api.apiFetch.mockRejectedValue(new ApiError('No run stored', 404, 'NO_RUN_STORED', '/proposals'))
    wrap(<PortfolioOptimizerSection />)
    expect(await screen.findByText('No run has been saved for this portfolio yet.')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Run optimizer' })).toBeEnabled()
  })

  it('runs only after a confirmation, saves, and reads the new run', async () => {
    api.apiFetch.mockResolvedValue(recorded)
    wrap(<PortfolioOptimizerSection />)
    await screen.findByText(recorded.headline)
    fireEvent.click(screen.getByRole('button', { name: 'Run optimizer' }))
    expect(api.apiFetch).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Run and save' }))
    await waitFor(() => expect(api.apiFetch).toHaveBeenCalledTimes(3)) // the run, then the stored run again
    const [url, init] = api.apiFetch.mock.calls[1]
    expect(url).toBe('/api/portfolios/p1/proposal-runs')
    expect(JSON.parse(init.body)).toEqual({ store: true, allow_stale: false })
  })

  it("shows the server's reason when a run is refused", async () => {
    api.apiFetch.mockImplementation((url: string) =>
      url.endsWith('/proposal-runs')
        ? Promise.reject(new ApiError('No benchmark history', 422, 'NO_BENCHMARK_HISTORY', '/proposal-runs'))
        : Promise.resolve(recorded),
    )
    wrap(<PortfolioOptimizerSection />)
    await screen.findByText(recorded.headline)
    fireEvent.click(screen.getByRole('button', { name: 'Run optimizer' }))
    fireEvent.click(screen.getByRole('button', { name: 'Run and save' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No benchmark history')
  })
})

describe('AvailableToTrade', () => {
  const answer = askFixture as unknown as Run

  it('asks without saving and shows the answer in its own panel', async () => {
    api.apiQuery.mockResolvedValue(answer)
    wrap(<AvailableToTrade />)
    fireEvent.change(screen.getByLabelText('Available to trade:'), { target: { value: '5000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Analyze allocation' }))
    const panel = await screen.findByRole('region', { name: 'Allocation answer' })
    expect(panel).toHaveTextContent(answer.headline)
    expect(panel).toHaveTextContent('Not saved')
    expect(api.apiQuery.mock.calls[0]).toEqual(['/api/portfolios/p1/ask', { amount_cad: 5000, account: null, store: false }])
    expect(api.apiFetch).not.toHaveBeenCalled()
  })

  it('sends the chosen account', async () => {
    api.apiQuery.mockResolvedValue(answer)
    wrap(<AvailableToTrade />)
    fireEvent.change(screen.getByLabelText('Available to trade:'), { target: { value: '100' } })
    fireEvent.change(screen.getByLabelText('in'), { target: { value: 'tfsa' } })
    fireEvent.click(screen.getByRole('button', { name: 'Analyze allocation' }))
    await waitFor(() => expect(api.apiQuery).toHaveBeenCalled())
    expect(api.apiQuery.mock.calls[0][1]).toMatchObject({ account: 'tfsa' })
  })
})
