import { describe, it, expect, vi, beforeEach } from 'vitest'
import { cn, formatCAD, formatPct, formatRelativeTime, formatDate, formatAgentName } from './utils'

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('deduplicates conflicting Tailwind classes (last wins)', () => {
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
  })

  it('handles conditional classes', () => {
    // eslint-disable-next-line no-constant-binary-expression
    expect(cn('base', false && 'skipped', 'included')).toBe('base included')
  })
})

describe('formatCAD', () => {
  it('formats positive values as CAD', () => {
    expect(formatCAD(1234.56)).toBe('$1,234.56')
  })

  it('formats negative values with minus sign', () => {
    expect(formatCAD(-500)).toBe('-$500.00')
  })

  it('formats zero', () => {
    expect(formatCAD(0)).toBe('$0.00')
  })

  it('formats large values with comma separators', () => {
    expect(formatCAD(1_000_000)).toBe('$1,000,000.00')
  })
})

describe('formatPct', () => {
  it('adds + prefix for positive values', () => {
    expect(formatPct(5.5)).toBe('+5.50%')
  })

  it('uses - prefix for negative values', () => {
    expect(formatPct(-3.25)).toBe('-3.25%')
  })

  it('formats zero with + prefix', () => {
    expect(formatPct(0)).toBe('+0.00%')
  })

  it('respects custom decimal places', () => {
    expect(formatPct(12.3456, 1)).toBe('+12.3%')
  })

  it('defaults to 2 decimal places', () => {
    expect(formatPct(7)).toBe('+7.00%')
  })
})

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-26T12:00:00Z'))
  })

  it('shows minutes for recent times', () => {
    const thirtyMinsAgo = new Date('2026-03-26T11:30:00Z').toISOString()
    expect(formatRelativeTime(thirtyMinsAgo)).toBe('30m ago')
  })

  it('shows hours for same-day times', () => {
    const threeHoursAgo = new Date('2026-03-26T09:00:00Z').toISOString()
    expect(formatRelativeTime(threeHoursAgo)).toBe('3h ago')
  })

  it('shows days for older times', () => {
    const twoDaysAgo = new Date('2026-03-24T12:00:00Z').toISOString()
    expect(formatRelativeTime(twoDaysAgo)).toBe('2d ago')
  })

  it('shows 0m for very recent times', () => {
    const now = new Date('2026-03-26T12:00:00Z').toISOString()
    expect(formatRelativeTime(now)).toBe('0m ago')
  })
})

describe('formatDate', () => {
  it('formats ISO date string to readable Canadian format', () => {
    expect(formatDate('2026-03-26T00:00:00Z')).toMatch(/Mar/)
  })

  it('includes year in output', () => {
    expect(formatDate('2026-03-26T00:00:00Z')).toContain('2026')
  })
})

describe('formatAgentName', () => {
  it('converts snake_case to Title Case', () => {
    expect(formatAgentName('fundamental_analyst')).toBe('Fundamental Analyst')
  })

  it('handles single word', () => {
    expect(formatAgentName('cio')).toBe('Cio')
  })

  it('handles multiple underscores', () => {
    expect(formatAgentName('bull_bear_advisor')).toBe('Bull Bear Advisor')
  })

  it('capitalises each word', () => {
    expect(formatAgentName('macro_economist')).toBe('Macro Economist')
  })
})
