import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { StockCall } from './StockCall'
import { OUTLOOK_LABELS, TIER_LABELS } from '@/lib/labels'
import { fixtureHolding } from '@/test/mock-data'

const show = (props: React.ComponentProps<typeof StockCall>) =>
  render(
    <MemoryRouter>
      <StockCall {...props} />
    </MemoryRouter>,
  )

const usable = fixtureHolding('RY.TO').call!
const analysis = usable.analysis!

describe('StockCall compact (the Holdings Call cell)', () => {
  it('shows the direction and the tier side by side as the same plain text', () => {
    show({ call: usable, compact: true })
    const direction = screen.getByText(OUTLOOK_LABELS[analysis.outlook!])
    const tier = screen.getByText(TIER_LABELS[analysis.tier!])
    expect(direction.tagName).toBe('SPAN')
    expect(tier.tagName).toBe('SPAN')
    expect(direction.className).toBe(tier.className) // neither is a pill
  })

  it('leaves the target price and expected return to their own column', () => {
    show({ call: usable, compact: true })
    expect(screen.queryByText('Target')).not.toBeInTheDocument()
    expect(screen.queryByText(/%$/)).toHaveTextContent(String(analysis.confidence)) // the only percent is the confidence
  })

  it('links to the analysis', () => {
    show({ call: usable, compact: true })
    expect(screen.getByRole('link', { name: 'Analysis' })).toHaveAttribute('href', `/analysis/${analysis.runId}`)
  })

  it('shows a call that cannot be used as one warning icon, with the reason in words for screen readers and on hover', () => {
    show({ call: fixtureHolding('TD.TO').call!, compact: true })
    const reason = screen.getByText('Analysis is out of date')
    expect(reason).toHaveClass('sr-only')
    expect(reason.parentElement).toHaveAttribute('title', expect.stringContaining('Analysis is out of date'))
  })

  it('says no call for a stock with none, and a dash for an instrument that is not analysed', () => {
    const { unmount } = show({ call: null, compact: true })
    expect(screen.getByText('No call')).toBeInTheDocument()
    unmount()
    show({ call: usable, compact: true, supported: false })
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('leaves the full layout (used by the Watchlist) as it was', () => {
    show({ call: usable })
    expect(screen.queryByText('Target')).not.toBeInTheDocument()
  })
})
