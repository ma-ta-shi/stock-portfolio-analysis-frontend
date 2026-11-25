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

vi.mock('@/components/SparklineChart', () => ({ SparklineChart: () => null }))
vi.mock('@/hooks/use-portfolio')
import { usePortfolioHoldings, usePortfolioSummary } from '@/hooks/use-portfolio'

// Every figure is the recorded API response (`npm run record:fixtures`) through the real `buildSummary`.
const positions = positionsFixture as unknown as ApiPositions
const parts = {
  positions,
  report: reportFixture as unknown as Api['ReportResponse'],
  history: historyFixture as unknown as Api['ValueHistoryResponse'],
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

describe('SummaryHeader', () => {
  it("shows the API's own value and unrealised gain for the whole portfolio", () => {
    show()
    expect(screen.getAllByText(money(positions.total.value_cad)).length).toBeGreaterThan(0)
    expect(screen.getByText('Value (incl. cash)')).toBeInTheDocument()
    expect(screen.getByText('Holdings').nextSibling).toHaveTextContent(String(mockHoldings.filter((h) => h.is_active).length))
  })

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

  it('warns when a broker confirmation is overdue', () => {
    const overdue = { ...positions, confirmations: [{ kind: 'position', account_type: 'tfsa', what: 'VFV.TO', last_confirmed: null, age_days: 90, overdue: true }] }
    show('combined', { positions: overdue as ApiPositions })
    expect(screen.getByText(/Not confirmed with the broker/)).toHaveTextContent('VFV.TO (90 days)')
  })

  it('explains why the contribution room is missing', () => {
    show('combined', { room: null, roomError: 'Your profile lacks a birth year' })
    expect(screen.getByText(/Contribution room unavailable: Your profile lacks a birth year/)).toBeInTheDocument()
  })

  it('opens the detail panel with the report, accounts and room lines', () => {
    show()
    expect(screen.getByText('Performance, tax and accounts')).toBeInTheDocument()
    expect(screen.getAllByText('Commission per trade').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Room today').length).toBeGreaterThan(0)
  })
})
