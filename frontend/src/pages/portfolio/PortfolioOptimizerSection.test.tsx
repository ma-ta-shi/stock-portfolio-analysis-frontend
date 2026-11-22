import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { PortfolioOptimizerSection } from './PortfolioOptimizerSection'
import type { PortfolioOptimizerResult } from '@/types'

vi.mock('@/hooks/use-portfolio')
import { usePortfolioOptimizer } from '@/hooks/use-portfolio'

const result: PortfolioOptimizerResult = {
  user_id: 'user_01',
  as_of: '2026-03-25T00:00:00Z',
  no_changes_needed: false,
  swap_suggestions: [
    {
      sell: { ticker: 'ENB.TO', account_type: 'rrsp', rationale: 'Weak outlook' },
      buy: { ticker: 'WSP.TO', account_type: 'rrsp', rationale: 'Strong outlook' },
      confidence: 0.68,
      expected_return_improvement_pct: 4.2,
      risk_change: 'lower',
    },
    {
      sell: { ticker: 'SHOP.TO', account_type: 'tfsa', rationale: 'r' },
      buy: { ticker: 'AAPL', account_type: 'tfsa', rationale: 'r' },
      confidence: 0.5,
      expected_return_improvement_pct: 2,
      risk_change: 'higher',
    },
  ],
  rebalance_suggestions: [
    { ticker: 'RY.TO', current_weight_pct: 5.2, target_weight_pct: 8, action: 'increase', amount_cad: 2500, confidence: 0.74, rationale: 'Underweight' },
  ],
}
const mockQuery = (overrides: object) =>
  vi.mocked(usePortfolioOptimizer).mockReturnValue({ isLoading: false, isError: false, ...overrides } as unknown as ReturnType<typeof usePortfolioOptimizer>)

describe('PortfolioOptimizerSection', () => {
  it('shows swaps with whole-percent improvement and fractional confidence', () => {
    mockQuery({ data: result })
    render(<PortfolioOptimizerSection accountFilter="combined" />)
    expect(screen.getByText('+4.2% expected')).toBeInTheDocument() // whole-percent field (see CLAUDE.md)
    expect(screen.getByText('68% confidence')).toBeInTheDocument()
    expect(screen.getByText('lower risk')).toBeInTheDocument()
  })

  it('shows rebalances with the amount in CAD', () => {
    mockQuery({ data: result })
    render(<PortfolioOptimizerSection accountFilter="combined" />)
    expect(screen.getByText('5.2% → 8.0%')).toBeInTheDocument()
    expect(screen.getByText(/Add \$2,500\.00/)).toBeInTheDocument()
  })

  it('filters swaps to the selected account', () => {
    mockQuery({ data: result })
    render(<PortfolioOptimizerSection accountFilter="tfsa" />)
    expect(screen.getByText('SHOP.TO')).toBeInTheDocument()
    expect(screen.queryByText('ENB.TO')).not.toBeInTheDocument()
  })

  it('says so when no changes are needed', () => {
    mockQuery({ data: { ...result, no_changes_needed: true } })
    render(<PortfolioOptimizerSection accountFilter="combined" />)
    expect(screen.getByText(/no changes suggested/)).toBeInTheDocument()
  })

  it('shows an error with retry', () => {
    const refetch = vi.fn()
    mockQuery({ data: undefined, isError: true, error: new Error('x'), refetch })
    render(<PortfolioOptimizerSection accountFilter="combined" />)
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(refetch).toHaveBeenCalled()
  })
})
