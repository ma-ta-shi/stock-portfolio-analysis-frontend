import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AccuracyCards } from './AccuracyCards'
import { mockFeedbackData } from '@/test/mock-data'

vi.mock('@/hooks/use-feedback')

import { useFeedback } from '@/hooks/use-feedback'
const mockUseFeedback = vi.mocked(useFeedback)

describe('AccuracyCards', () => {
  it('shows loading skeletons while loading', () => {
    mockUseFeedback.mockReturnValue({ data: undefined, isLoading: true } as ReturnType<typeof useFeedback>)
    const { container } = render(<AccuracyCards />)
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(4)
  })

  it('renders nothing when data is undefined', () => {
    mockUseFeedback.mockReturnValue({ data: undefined, isLoading: false } as ReturnType<typeof useFeedback>)
    const { container } = render(<AccuracyCards />)
    expect(container.firstChild).toBeNull()
  })

  it('renders all 4 stat cards', () => {
    mockUseFeedback.mockReturnValue({ data: mockFeedbackData, isLoading: false } as ReturnType<typeof useFeedback>)
    render(<AccuracyCards />)
    expect(screen.getByText('Direction Accuracy')).toBeInTheDocument()
    expect(screen.getByText('Avg Composite Score')).toBeInTheDocument()
    expect(screen.getByText('Alpha vs TSX')).toBeInTheDocument()
    expect(screen.getByText('Predictions Scored')).toBeInTheDocument()
  })

  it('displays direction accuracy as a percentage', () => {
    mockUseFeedback.mockReturnValue({ data: mockFeedbackData, isLoading: false } as ReturnType<typeof useFeedback>)
    render(<AccuracyCards />)
    // 0.75 * 100 = 75 → "75%"
    expect(screen.getByText('75%')).toBeInTheDocument()
  })

  it('displays the avg composite score', () => {
    mockUseFeedback.mockReturnValue({ data: mockFeedbackData, isLoading: false } as ReturnType<typeof useFeedback>)
    render(<AccuracyCards />)
    expect(screen.getByText('0.68')).toBeInTheDocument()
  })

  it('shows prediction count in sub-label', () => {
    mockUseFeedback.mockReturnValue({ data: mockFeedbackData, isLoading: false } as ReturnType<typeof useFeedback>)
    render(<AccuracyCards />)
    expect(screen.getByText('24 predictions scored')).toBeInTheDocument()
  })

  it('applies green colour when direction accuracy >= 70%', () => {
    mockUseFeedback.mockReturnValue({ data: mockFeedbackData, isLoading: false } as ReturnType<typeof useFeedback>)
    render(<AccuracyCards />)
    const pctEl = screen.getByText('75%')
    expect(pctEl.className).toContain('emerald')
  })

  it('applies amber colour when direction accuracy is 55–69%', () => {
    const lowAccData = {
      ...mockFeedbackData,
      accuracy_summary: { ...mockFeedbackData.accuracy_summary, direction_accuracy: 0.60 },
    }
    mockUseFeedback.mockReturnValue({ data: lowAccData, isLoading: false } as ReturnType<typeof useFeedback>)
    render(<AccuracyCards />)
    const pctEl = screen.getByText('60%')
    expect(pctEl.className).toContain('amber')
  })

  it('applies red colour when direction accuracy < 55%', () => {
    const poorAccData = {
      ...mockFeedbackData,
      accuracy_summary: { ...mockFeedbackData.accuracy_summary, direction_accuracy: 0.40 },
    }
    mockUseFeedback.mockReturnValue({ data: poorAccData, isLoading: false } as ReturnType<typeof useFeedback>)
    render(<AccuracyCards />)
    const pctEl = screen.getByText('40%')
    expect(pctEl.className).toContain('red')
  })
})
