import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RecommendationBadge } from './RecommendationBadge'

describe('RecommendationBadge', () => {
  it('renders BUY recommendation', () => {
    render(<RecommendationBadge recommendation="BUY" />)
    expect(screen.getByText('BUY')).toBeInTheDocument()
  })

  it('renders HOLD recommendation', () => {
    render(<RecommendationBadge recommendation="HOLD" />)
    expect(screen.getByText('HOLD')).toBeInTheDocument()
  })

  it('renders SELL recommendation', () => {
    render(<RecommendationBadge recommendation="SELL" />)
    expect(screen.getByText('SELL')).toBeInTheDocument()
  })

  it('applies green colour for BUY', () => {
    render(<RecommendationBadge recommendation="BUY" />)
    const badge = screen.getByText('BUY')
    expect(badge.className).toContain('emerald')
  })

  it('applies amber colour for HOLD', () => {
    render(<RecommendationBadge recommendation="HOLD" />)
    const badge = screen.getByText('HOLD')
    expect(badge.className).toContain('amber')
  })

  it('applies red colour for SELL', () => {
    render(<RecommendationBadge recommendation="SELL" />)
    const badge = screen.getByText('SELL')
    expect(badge.className).toContain('red')
  })

  it('applies larger text class when size=lg', () => {
    render(<RecommendationBadge recommendation="BUY" size="lg" />)
    const badge = screen.getByText('BUY')
    expect(badge.className).toContain('text-base')
  })
})
