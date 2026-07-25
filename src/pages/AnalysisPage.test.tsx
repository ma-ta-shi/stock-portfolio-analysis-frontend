import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AnalysisPage } from './AnalysisPage'

vi.mock('@/hooks/use-analysis')
vi.mock('@/hooks/use-portfolio')

import { useAnalysisRun, useAgentResults } from '@/hooks/use-analysis'
import { usePortfolioHoldings } from '@/hooks/use-portfolio'

const mockUseAnalysisRun = vi.mocked(useAnalysisRun)
const mockUseAgentResults = vi.mocked(useAgentResults)
const mockUsePortfolioHoldings = vi.mocked(usePortfolioHoldings)

function renderAnalysisPage(analysisId = 'run_001') {
  return render(
    <MemoryRouter initialEntries={[`/analysis/${analysisId}`]}>
      <Routes>
        <Route path="/analysis/:analysisId" element={<AnalysisPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

function seedPortfolioEmpty() {
  mockUsePortfolioHoldings.mockReturnValue({
    data: [],
    isLoading: false,
  } as unknown as ReturnType<typeof usePortfolioHoldings>)
}

describe('AnalysisPage — loading state', () => {
  it('renders skeleton while loading', () => {
    mockUseAnalysisRun.mockReturnValue({ data: undefined, isLoading: true, isError: false, refetch: vi.fn() } as unknown as ReturnType<typeof useAnalysisRun>)
    mockUseAgentResults.mockReturnValue({ data: undefined, isLoading: true, isError: false } as unknown as ReturnType<typeof useAgentResults>)
    seedPortfolioEmpty()

    const { container } = renderAnalysisPage()
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })
})

describe('AnalysisPage — error state', () => {
  it('shows retry button when run fetch fails', () => {
    mockUseAnalysisRun.mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch: vi.fn() } as unknown as ReturnType<typeof useAnalysisRun>)
    mockUseAgentResults.mockReturnValue({ data: undefined, isLoading: false, isError: false } as unknown as ReturnType<typeof useAgentResults>)
    seedPortfolioEmpty()

    renderAnalysisPage()
    expect(screen.getByText(/failed to load analysis/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('shows retry button when agents fetch fails', () => {
    mockUseAnalysisRun.mockReturnValue({ data: undefined, isLoading: false, isError: false, refetch: vi.fn() } as unknown as ReturnType<typeof useAnalysisRun>)
    mockUseAgentResults.mockReturnValue({ data: undefined, isLoading: false, isError: true } as unknown as ReturnType<typeof useAgentResults>)
    seedPortfolioEmpty()

    renderAnalysisPage()
    expect(screen.getByText(/failed to load analysis/i)).toBeInTheDocument()
  })
})

describe('AnalysisPage — not found state', () => {
  it('shows not-found message when run is missing and no error', () => {
    mockUseAnalysisRun.mockReturnValue({ data: undefined, isLoading: false, isError: false, refetch: vi.fn() } as unknown as ReturnType<typeof useAnalysisRun>)
    mockUseAgentResults.mockReturnValue({ data: undefined, isLoading: false, isError: false } as unknown as ReturnType<typeof useAgentResults>)
    seedPortfolioEmpty()

    renderAnalysisPage()
    expect(screen.getByText(/analysis not found/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /retry/i })).toBeNull()
  })
})
