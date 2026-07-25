import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OutlookBadge } from './OutlookBadge'

describe('OutlookBadge', () => {
  it('renders "Bullish" for bullish direction', () => {
    render(<OutlookBadge direction="bullish" />)
    expect(screen.getByText('Bullish')).toBeInTheDocument()
  })

  it('renders "Somewhat Bullish" for somewhat_bullish', () => {
    render(<OutlookBadge direction="somewhat_bullish" />)
    expect(screen.getByText('Somewhat Bullish')).toBeInTheDocument()
  })

  it('renders "Neutral" for neutral direction', () => {
    render(<OutlookBadge direction="neutral" />)
    expect(screen.getByText('Neutral')).toBeInTheDocument()
  })

  it('renders "Somewhat Bearish" for somewhat_bearish', () => {
    render(<OutlookBadge direction="somewhat_bearish" />)
    expect(screen.getByText('Somewhat Bearish')).toBeInTheDocument()
  })

  it('renders "Bearish" for bearish direction', () => {
    render(<OutlookBadge direction="bearish" />)
    expect(screen.getByText('Bearish')).toBeInTheDocument()
  })

  it('applies emerald-600 for bullish', () => {
    render(<OutlookBadge direction="bullish" />)
    expect(screen.getByText('Bullish').className).toContain('emerald-600')
  })

  it('applies emerald-400 for somewhat_bullish', () => {
    render(<OutlookBadge direction="somewhat_bullish" />)
    expect(screen.getByText('Somewhat Bullish').className).toContain('emerald-400')
  })

  it('applies amber for neutral', () => {
    render(<OutlookBadge direction="neutral" />)
    expect(screen.getByText('Neutral').className).toContain('amber')
  })

  it('applies orange for somewhat_bearish', () => {
    render(<OutlookBadge direction="somewhat_bearish" />)
    expect(screen.getByText('Somewhat Bearish').className).toContain('orange')
  })

  it('applies red-600 for bearish', () => {
    render(<OutlookBadge direction="bearish" />)
    expect(screen.getByText('Bearish').className).toContain('red-600')
  })

  it('applies larger text class when size=lg', () => {
    render(<OutlookBadge direction="bullish" size="lg" />)
    expect(screen.getByText('Bullish').className).toContain('text-base')
  })
})
