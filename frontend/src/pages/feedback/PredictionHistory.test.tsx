import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PredictionHistory } from './PredictionHistory'

vi.mock('@/hooks/use-predictions')

import { usePredictions } from '@/hooks/use-predictions'

const mockUsePredictions = vi.mocked(usePredictions)

describe('PredictionHistory', () => {
  it('renders confidence as whole-number percent', () => {
    mockUsePredictions.mockReturnValue({
      data: {
        data: [
          {
            prediction_id: 'pred_001',
            user_id: 'user_01',
            analysis_id: 'run_001',
            ticker: 'SHOP.TO',
            recommendation: 'BUY',
            confidence_score: 74,
            price_at_recommendation: 100,
            recommended_at: '2026-03-26T00:00:00Z',
            account_type: 'tfsa',
            timeline: 'medium_term',
            checkpoints: [],
            composite_score: 0.7,
            status: 'active',
          },
        ],
      },
      isLoading: false,
    } as ReturnType<typeof usePredictions>)

    render(<PredictionHistory />)
    expect(screen.getByText('74%')).toBeInTheDocument()
    expect(screen.queryByText('7400%')).not.toBeInTheDocument()
  })
})
