import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DisagreementIndicator } from './DisagreementIndicator'

describe('DisagreementIndicator', () => {
  it('renders the label text', () => {
    render(<DisagreementIndicator label="low" />)
    expect(screen.getByText(/low/i)).toBeInTheDocument()
  })

  it('applies green colour for low disagreement', () => {
    render(<DisagreementIndicator label="low" />)
    expect(screen.getByText(/low/i).className).toContain('emerald')
  })

  it('applies amber colour for moderate disagreement', () => {
    render(<DisagreementIndicator label="moderate" />)
    expect(screen.getByText(/moderate/i).className).toContain('amber')
  })

  it('applies red colour for high disagreement', () => {
    render(<DisagreementIndicator label="high" />)
    expect(screen.getByText(/high/i).className).toContain('red')
  })

  it('shows score when provided', () => {
    render(<DisagreementIndicator label="moderate" score={0.42} />)
    expect(screen.getByText('(0.42)')).toBeInTheDocument()
  })

  it('hides score when not provided', () => {
    render(<DisagreementIndicator label="low" />)
    expect(screen.queryByText(/\(/)).not.toBeInTheDocument()
  })
})
