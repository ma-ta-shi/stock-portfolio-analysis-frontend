import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OutlookBadge } from './OutlookBadge'
import { BADGE } from '@/lib/labels'

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

  it.each([
    ['bullish', 'Bullish', BADGE.positive],
    ['somewhat_bullish', 'Somewhat Bullish', BADGE.positiveSoft],
    ['neutral', 'Neutral', BADGE.warningSoft],
    ['somewhat_bearish', 'Somewhat Bearish', BADGE.cautionSoft],
    ['bearish', 'Bearish', BADGE.negative],
  ] as const)('uses the accessible %s badge colours', (direction, label, classes) => {
    render(<OutlookBadge direction={direction} />)
    for (const c of classes.split(' ')) expect(screen.getByText(label)).toHaveClass(c)
  })

  it('applies larger text class when size=lg', () => {
    render(<OutlookBadge direction="bullish" size="lg" />)
    expect(screen.getByText('Bullish').className).toContain('text-base')
  })
})
