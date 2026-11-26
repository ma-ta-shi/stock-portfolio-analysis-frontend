import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { SummaryHeader } from './SummaryHeader'
import { buildSummary, type ApiPositions } from '@/lib/portfolio-mappers'
import { mockHoldings } from '@/test/mock-data'
import type { components } from '@/types/openapi.gen'
import positionsFixture from '../../../public/mock-data/portfolio/positions.json'
import historyFixture from '../../../public/mock-data/portfolio/value-history.json'
import reportFixture from '../../../public/mock-data/portfolio/report.json'
import accountsFixture from '../../../public/mock-data/portfolio/accounts.json'
import roomFixture from '../../../public/mock-data/portfolio/room.json'

type Api = components['schemas']

vi.mock('@/hooks/use-portfolio')
import { usePortfolioHoldings, usePortfolioSummary } from '@/hooks/use-portfolio'

// Every figure is the recorded API response (`npm run record:fixtures`) through the real `buildSummary`.
const positions = positionsFixture as unknown as ApiPositions
const history = historyFixture as unknown as Api['ValueHistoryResponse']
const parts = {
  positions,
  report: reportFixture as unknown as Api['ReportResponse'],
  history,
  accounts: (accountsFixture as unknown as { data: Api['PortfolioAccountResponse'][] }).data,
  room: roomFixture as unknown as Api['RoomResponse'],
}
const money = (v: number) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(v)

function show(view: 'combined' | 'tfsa' = 'combined', overrides: Partial<Parameters<typeof buildSummary>[0]> = {}, onAccountChange = vi.fn()) {
  const data = buildSummary({ view, ...parts, ...overrides })
  vi.mocked(usePortfolioSummary).mockReturnValue({ data, isLoading: false, isError: false } as unknown as ReturnType<typeof usePortfolioSummary>)
  render(<SummaryHeader accountView={view} onAccountChange={onAccountChange} />)
  return { data, onAccountChange }
}

beforeEach(() => {
  vi.mocked(usePortfolioHoldings).mockReturnValue({ data: mockHoldings.filter((h) => h.is_active) } as unknown as ReturnType<typeof usePortfolioHoldings>)
})

describe('SummaryHeader: the original tiles', () => {
  it('shows the tiles of the original design in its order, with Realized right beside Unrealized', () => {
    show()
    const labels = screen
      .getAllByText(/^(Total Value|Cash|Unrealized|Realized|Total Return|Dividends Received|Value change|Expected dividend income)/)
      .map((e) => e.textContent?.replace(/ \(next 12 months\)/, ''))
    expect(labels).toEqual(['Total Value', 'Cash', 'Unrealized', 'Realized', 'Total Return', 'Dividends Received', 'Value change', 'Expected dividend income'])
  })

  it("shows the API's own value and unrealised gain for the whole portfolio", () => {
    show()
    expect(screen.getAllByText(money(positions.total.value_cad)).length).toBeGreaterThan(0)
    expect(screen.queryByText('Holdings')).not.toBeInTheDocument()
  })

  it('has no tile the original did not have, and no performance dropdown', () => {
    show()
    for (const label of ['Estimated tax', 'Fees', 'Profit', 'Return per year', 'Versus benchmark fund', 'Prices as of']) {
      expect(screen.queryByText(label)).not.toBeInTheDocument()
    }
    expect(screen.queryByText('Performance, tax and accounts')).not.toBeInTheDocument()
    expect(screen.queryByText('Money in and out')).not.toBeInTheDocument()
  })

  it('says what the expected dividend income is, on hover', () => {
    show()
    expect(screen.getByText(/Expected dividend income/)).toHaveAttribute('title', expect.stringContaining('expected dividends per share times your shares'))
  })

  it('does not mention confirming with the broker, and has no cash button', () => {
    show()
    expect(screen.queryByText(/broker/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /cash/i })).not.toBeInTheDocument()
  })
})

describe('SummaryHeader: the value graph', () => {
  it('writes the first and the last value under the line, with their days', () => {
    show()
    const first = history.points[0]
    const last = history.points[history.points.length - 1]
    const caption = screen.getByRole('figure', { name: 'Portfolio value over time' })
    expect(caption).toHaveTextContent(money(first.value_cad))
    expect(caption).toHaveTextContent(money(last.value_cad))
  })

  it('says there is not enough history instead of drawing a dot', () => {
    show('combined', { history: { ...history, points: history.points.slice(0, 1) } })
    expect(screen.getByText(/Not enough history yet/)).toBeInTheDocument()
    expect(screen.queryByRole('figure', { name: 'Portfolio value over time' })).not.toBeInTheDocument()
  })
})

describe('SummaryHeader', () => {
  it('shows one account card per account, each opening that account, with its contribution room', () => {
    const { onAccountChange } = show()
    fireEvent.click(screen.getByRole('button', { name: /^TFSA/ }))
    expect(onAccountChange).toHaveBeenCalledWith('tfsa')
    expect(screen.getAllByText(/^Room /).length).toBeGreaterThan(0)
  })

  it('shows the selected account only, without the account cards', () => {
    show('tfsa')
    expect(screen.queryByRole('button', { name: /^TFSA/ })).not.toBeInTheDocument()
    expect(screen.getAllByText(money(positions.accounts.tfsa!.value_cad)).length).toBeGreaterThan(0)
  })

  it('says a part that failed to load is unavailable instead of guessing it', () => {
    show('combined', { report: null, history: null })
    expect(screen.getAllByText('unavailable').length).toBeGreaterThan(0)
    expect(screen.getByText(/unavailable \(P-D2\)/)).toBeInTheDocument()
  })

  it('warns about holdings carried at cost because they have no price', () => {
    const unpriced = { ...positions, total: { ...positions.total, unpriced: ['ZZZ'] } }
    show('combined', { positions: unpriced })
    expect(screen.getByRole('status')).toHaveTextContent('No price recorded for ZZZ')
  })

  it('explains why the contribution room is missing', () => {
    show('combined', { room: null, roomError: 'Your profile lacks a birth year' })
    expect(screen.getByText(/Contribution room unavailable: Your profile lacks a birth year/)).toBeInTheDocument()
  })
})
