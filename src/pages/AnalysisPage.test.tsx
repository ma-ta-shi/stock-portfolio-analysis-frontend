import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AnalysisPage } from './AnalysisPage'
import { installFixtureFetch } from '@/test/fixture-fetch'
import result from '../../public/mock-data/stocks/result.json'
import runs from '../../public/mock-data/stocks/runs.json'
import fundamentals from '../../public/mock-data/stocks/fundamentals.json'

vi.mock('@/hooks/use-portfolio')
vi.mock('@/hooks/use-fx-rates', () => ({ useFxRates: () => ({ rates: { CAD: 1, USD: 1.4 }, isLoading: false }) }))

import { usePortfolioHoldings } from '@/hooks/use-portfolio'

// The page runs its real hooks and mappers over the recorded responses (the end-to-end seed's RY.TO).
const RESULT = '/mock-data/stocks/result.json'

beforeEach(() => {
  vi.mocked(usePortfolioHoldings).mockReturnValue({ data: [] } as unknown as ReturnType<typeof usePortfolioHoldings>)
})
afterEach(() => vi.unstubAllGlobals())

function show(overrides: Record<string, unknown> = {}, id = result.analysis_id) {
  installFixtureFetch(overrides)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/analysis/${id}`]}>
        <Routes>
          <Route path="/analysis/:analysisId" element={<AnalysisPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const open = async (name: string) => {
  const trigger = await screen.findByRole('button', { name: new RegExp(name) })
  fireEvent.click(trigger)
  return trigger.closest('[data-slot="accordion-item"]') as HTMLElement
}

describe('AnalysisPage: a completed run', () => {
  it('shows the call at the price it was made at, with the account unavailable', async () => {
    show()
    const call = await screen.findByRole('region', { name: 'Call' })
    expect(call).toHaveTextContent('Bullish · Outperform')
    expect(call).toHaveTextContent(`$${result.price_band.target_price.toFixed(2)}`)
    expect(call).toHaveTextContent('Target and return are at the price at analysis.')
    expect(within(call).queryByRole('link', { name: 'Analysis' })).not.toBeInTheDocument()
    expect(screen.getByText(/Account: unavailable \(S-3\)/)).toHaveTextContent('medium term')
    expect(screen.getByText('Price at analysis')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('RY.TO')
  })

  it('draws Layer 1, says Layer 2 is unavailable, and ends with the run facts', async () => {
    show()
    const layer1 = await screen.findByRole('region', { name: 'Layer 1 — Stock Outlook' })
    expect(layer1).toHaveTextContent('Margin expansion')
    expect(layer1).toHaveTextContent(result.synthesis_narrative)
    expect(screen.getByText(/unavailable \(S-2\)/)).toBeInTheDocument()
    expect(screen.getByText('Trace:').nextSibling).toHaveTextContent(result.analysis_id)
    expect(screen.getByText('Price at analysis:').nextSibling).toHaveTextContent('$100.00')
  })

  it('lists the agents in order and no shadow CIO', async () => {
    show()
    await screen.findByRole('region', { name: 'Call' })
    const names = screen.getAllByRole('button', { name: /Pass [12]/ }).map((b) => b.textContent!.replace(/Pass.*/, ''))
    expect(names).toEqual(['Fundamental Analyst', 'Technical Analyst', 'Sentiment Analyst', 'Macro Economist', 'Stock Researcher', 'Bull Advocate', 'Bear Advocate', 'Risk Advisor'])
  })

  it("shows what each kind of agent writes: findings and risks, an advocate's case, the risk reading", async () => {
    show()
    const fund = await open('Fundamental Analyst')
    expect(fund).toHaveTextContent('Seeded fundamental assessment.')
    expect(fund).toHaveTextContent('Seeded fundamental narrative.')
    expect(fund).toHaveTextContent('Seeded fundamental risk (medium)')

    const bull = await open('Bull Advocate')
    expect(bull).toHaveTextContent('Confidence 60%')
    expect(bull).toHaveTextContent('Seeded bull strongest argument.')
    expect(bull).toHaveTextContent('Seeded bull weakest point.')
    expect(bull).toHaveTextContent('Risks to this case')
    expect(bull).toHaveTextContent('Seeded bull thesis risk (low)')
    expect(bull).not.toHaveTextContent('Critical Risks') // a risk to the case is not a warning about the stock
    expect(bull).not.toHaveTextContent('BUY')

    const risk = await open('Risk Advisor')
    expect(risk).toHaveTextContent('Seeded risk summary.')
    expect(risk).toHaveTextContent('Seeded strongest signal.')
  })
})

describe('AnalysisPage: runs without everything', () => {
  it('says the fundamentals are the newest, not those of this analysis', async () => {
    show({ '/mock-data/stocks/fundamentals.json': { ...fundamentals, run_id: 'r', run_day: '2026-11-20' } })
    expect(await screen.findByText(/Fundamentals as of Nov 20, 2026\. These and the market cap are the newest.*unavailable \(S-6\)$/)).toBeInTheDocument()
  })

  it('says why a failed run failed and draws no call', async () => {
    show({ [RESULT]: { ...result, analysis_id: 'none', status: 'failed', failure: { stage: 'pass1', message: 'model not reachable' }, agent_outputs: [], price_band: null } }, 'none')
    expect(await screen.findByRole('status')).toHaveTextContent('This analysis failed at pass1: model not reachable')
    expect(screen.queryByRole('region', { name: 'Call' })).not.toBeInTheDocument()
    expect(screen.queryByText('Agent Results')).not.toBeInTheDocument()
    expect(await screen.findByText('No price recorded')).toBeInTheDocument()
  })

  it('says a run is still running', async () => {
    show({ [RESULT]: { ...result, status: 'running', completed_at: null, agent_outputs: [] } })
    expect(await screen.findByRole('status')).toHaveTextContent('still running')
  })

  it('takes the price of a run without a band from its prediction, and dashes the target', async () => {
    const earlier = runs.data[1].analysis_id
    show({ [RESULT]: { ...result, analysis_id: earlier, price_band: null } }, earlier)
    const call = await screen.findByRole('region', { name: 'Call' })
    expect(within(call).getByText('Target price (12 months)').nextSibling).toHaveTextContent('—')
    expect(call).not.toHaveTextContent('Target and return are at')
    expect(await screen.findByText('Price at analysis:')).toBeInTheDocument()
    await vi.waitFor(() => expect(screen.getByText('Price at analysis:').nextSibling).toHaveTextContent('$95.00'))
  })
})

describe('AnalysisPage: states', () => {
  it('does not show a run from before the price band, nor read anything else for it', async () => {
    show({ [RESULT]: { ...result, triggered_at: '2026-10-12T20:00:00Z', price_band: null }, '/mock-data/stocks/stock.json': 500 })
    expect(await screen.findByRole('status')).toHaveTextContent('made before the price range was introduced')
    expect(screen.queryByText(result.synthesis_narrative)).not.toBeInTheDocument()
    expect(screen.queryByText('Agent Results')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument() // the stock was not asked for
  })

  it('says an analysis that does not exist was not found', async () => {
    show({ [RESULT]: 404 })
    expect(await screen.findByText('Analysis not found.')).toBeInTheDocument()
  })

  it('offers a retry when the analysis cannot be read', async () => {
    show({ [RESULT]: 500 })
    expect(await screen.findByRole('button', { name: /retry/i })).toBeInTheDocument()
  })
})
