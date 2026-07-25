import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ConfidenceMeter } from './ConfidenceMeter'

describe('ConfidenceMeter', () => {
  it('renders the score as a percentage label by default', () => {
    render(<ConfidenceMeter score={72} />)
    expect(screen.getByText('72%')).toBeInTheDocument()
  })

  it('hides label when showLabel=false', () => {
    render(<ConfidenceMeter score={72} showLabel={false} />)
    expect(screen.queryByText('72%')).not.toBeInTheDocument()
  })

  it('sets bar width to the score percentage', () => {
    const { container } = render(<ConfidenceMeter score={60} />)
    const bar = container.querySelector('[style*="width"]') as HTMLElement
    expect(bar.style.width).toBe('60%')
  })

  it('uses green colour for score >= 75', () => {
    const { container } = render(<ConfidenceMeter score={80} />)
    const bar = container.querySelector('[style*="width"]') as HTMLElement
    expect(bar.className).toContain('emerald')
  })

  it('uses amber colour for score between 55 and 74', () => {
    const { container } = render(<ConfidenceMeter score={65} />)
    const bar = container.querySelector('[style*="width"]') as HTMLElement
    expect(bar.className).toContain('amber')
  })

  it('uses red colour for score below 55', () => {
    const { container } = render(<ConfidenceMeter score={40} />)
    const bar = container.querySelector('[style*="width"]') as HTMLElement
    expect(bar.className).toContain('red')
  })

  it('uses amber at exactly 55 (boundary)', () => {
    const { container } = render(<ConfidenceMeter score={55} />)
    const bar = container.querySelector('[style*="width"]') as HTMLElement
    expect(bar.className).toContain('amber')
  })

  it('uses green at exactly 75 (boundary)', () => {
    const { container } = render(<ConfidenceMeter score={75} />)
    const bar = container.querySelector('[style*="width"]') as HTMLElement
    expect(bar.className).toContain('emerald')
  })
})
