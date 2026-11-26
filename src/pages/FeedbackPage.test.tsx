/** The Feedback page over the recorded batch, versions and predictions, and the real scorer's output on made-up results. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { mapScorecard } from '@/lib/feedback'
import { checkedText, mapCheckpoints, type ApiPrediction } from '@/lib/predictions'
import { installFixtureFetch } from '@/test/fixture-fetch'
import overviewFile from '../../public/mock-data/feedback/scorecard-overview.json'
import scoringFile from '../../public/mock-data/feedback/scorecard-scoring.json'
import batchFile from '../../public/mock-data/feedback/weekly-batch.json'
import predictionsFile from '../../public/mock-data/feedback/predictions.json'
import versionsFile from '../../public/mock-data/feedback/pipeline-versions.json'
import { FeedbackPage } from './FeedbackPage'

const portfolio = vi.hoisted(() => ({ portfolioId: 'p1', isEmpty: false, isError: false }))
vi.mock('@/hooks/use-portfolio-id', () => ({ usePortfolioId: () => portfolio }))
vi.mock('@/context/UserContext', () => ({ useUser: () => ({ userId: 'u1', setUserId: vi.fn() }) }))

type Args = Parameters<typeof mapScorecard>
const [overview, scoring, versions] = [overviewFile, scoringFile, versionsFile] as unknown as Args
const OVERVIEW = '/mock-data/feedback/scorecard-overview.json'
const older = { ...overviewFile, data: { ...overviewFile.data, current_cohort: 'P14-B1' } }

function show() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <FeedbackPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
const region = (name: string) => screen.getByRole('region', { name })

beforeEach(() => installFixtureFetch())
afterEach(() => vi.unstubAllGlobals())

describe('mapScorecard', () => {
  it("reads the current version's one-month figures", () => {
    const card = mapScorecard(overview, scoring, versions)
    expect(card.state).toBe('current')
    if (card.state !== 'current') return
    const cohort = (scoringFile.data as unknown as Record<string, { horizons: { '1m': { measures: { n: number } } } }>)[overviewFile.data.current_cohort]
    expect(card.figures.scored).toBe(cohort.horizons['1m'].measures.n)
    expect(card.figures.bands.map((b) => b.band)).toEqual(['under_50', '50_to_64', '65_and_over'])
    expect(card.figures.nextVerdictAt).toBe(200)
  })

  it('shows no figures from a scorecard of an earlier pipeline version', () => {
    const card = mapScorecard(older as unknown as Args[0], scoring, versions)
    expect(card).toMatchObject({ state: 'old', version: 'P14', pipeline: versionsFile.data.at(-1)!.id })
    expect(card).not.toHaveProperty('figures')
  })

  it('keeps the figures when the newer version has the same view', () => {
    const last = versionsFile.data.at(-1)!
    const next = { ...last, id: 'P99', view_comparable_with_previous: true }
    const withNext = { ...versionsFile, data: [...versionsFile.data, next] } as unknown as Args[2]
    expect(mapScorecard(overview, scoring, withNext).state).toBe('current')
    const changed = { ...versionsFile, data: [...versionsFile.data, { ...next, view_comparable_with_previous: false }] } as unknown as Args[2]
    expect(mapScorecard(overview, scoring, changed).state).toBe('old')
  })

  it('is empty, not broken, when no batch run of the current version exists yet', () => {
    const card = mapScorecard(overview, { ...scoring, data: {} }, versions)
    expect(card.state === 'current' && card.figures).toMatchObject({ runs: 0, scored: 0, marketHit: null, bands: [] })
  })
})

describe('check-ins', () => {
  it('says where a prediction stands, in fractions', () => {
    const [first] = predictionsFile.data as unknown as ApiPrediction[]
    expect(checkedText(mapCheckpoints(first))).toBe('Waiting')
    expect(checkedText([])).toBe('Not scored: no price band')
    const resolved = { ...first, checkpoints: [{ ...first.checkpoints[0], status: 'resolved' as const, excess_return_pct: -3.5 }] }
    expect(mapCheckpoints(resolved)[0].excessReturn).toBeCloseTo(-0.035)
  })
})

describe('FeedbackPage', () => {
  it("shows the batch, the current scorecard's figures, the agent placeholder and the predictions", async () => {
    show()
    const progress = region('Progress')
    expect(await within(progress).findByText(`${batchFile.week.done.length} of ${batchFile.week.required.length} done`)).toBeInTheDocument()
    expect(await within(progress).findByText('Toward a verdict')).toBeInTheDocument()
    expect(await screen.findByText(/1-month results of pipeline P/)).toBeInTheDocument()
    expect(region('Accuracy')).toHaveTextContent('Hit rate beyond the baseline')
    expect(region('Agent Accuracy')).toHaveTextContent('Not scored yet')
    expect(await screen.findByRole('link', { name: predictionsFile.data[0].stock.ticker })).toHaveAttribute('href', `/stocks/${predictionsFile.data[0].stock.stock_id}`)
    expect(screen.queryByText(/Competence|Learning Journal/)).not.toBeInTheDocument()
  })

  it('opens a prediction to its check-ins and predicted range', async () => {
    show()
    const toggle = (await screen.findAllByRole('button', { name: /Show details of/ }))[0]
    fireEvent.click(toggle)
    expect(screen.getByText('Predicted range')).toBeInTheDocument()
    expect(screen.getByText('12 months')).toBeInTheDocument()
  })

  it('says why there are no figures when the scorecard is for an earlier version', async () => {
    installFixtureFetch({ [OVERVIEW]: older })
    show()
    expect(await screen.findByText(/is for pipeline P14; the pipeline is now/)).toBeInTheDocument()
    expect(region('Accuracy')).toHaveTextContent('No current figures')
    expect(region('Confidence Calibration')).toHaveTextContent('Nothing scored yet')
    expect(screen.queryByText('Toward a verdict')).not.toBeInTheDocument()
  })

  it('says when no scorecard has been saved, without calling it an error', async () => {
    const fixtures = installFixtureFetch()
    const serve = fixtures.getMockImplementation()!
    fixtures.mockImplementation(async (input) =>
      String(input).includes('scorecard-')
        ? new Response(JSON.stringify({ error: { code: 'SCORECARD_NOT_FOUND', message: 'none' } }), { status: 404 })
        : serve(input),
    )
    show()
    expect(await screen.findByText(/No scorecard has been saved yet/)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('says why when results exist but a figure cannot be worked out', async () => {
    const data = structuredClone(scoringFile.data) as unknown as Record<string, { horizons: { '1m': { measures: { q1: { rank_correlation: number | null; hit_vs_baseline: { n: number; rate: number | null } } } } } }>
    const q1 = data[overviewFile.data.current_cohort].horizons['1m'].measures.q1
    q1.rank_correlation = null
    q1.hit_vs_baseline = { ...q1.hit_vs_baseline, n: 0, rate: null }
    installFixtureFetch({ '/mock-data/feedback/scorecard-scoring.json': { ...scoringFile, data } })
    show()
    expect(await screen.findByText('Too few in any month to rank')).toBeInTheDocument()
    expect(screen.getByText('No call with a direction yet')).toBeInTheDocument()
  })

  it('offers a retry, not an endless placeholder, when the portfolio cannot be read', async () => {
    Object.assign(portfolio, { portfolioId: null, isError: true, error: new Error('down') })
    show()
    expect(await within(region('Your portfolio vs the market fund')).findByRole('alert')).toHaveTextContent('your portfolio')
    Object.assign(portfolio, { portfolioId: 'p1', isError: false, error: undefined })
  })

  it('tells a user without a portfolio there is no chart', async () => {
    portfolio.isEmpty = true
    show()
    expect(await screen.findByText('You have no portfolio yet.')).toBeInTheDocument()
    portfolio.isEmpty = false
  })
})
