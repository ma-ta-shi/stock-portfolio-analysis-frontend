import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  formatAgentName,
  formatCAD,
  formatDate,
  formatEnumLabel,
  formatMoney,
  formatNumber,
  formatPct,
  formatPercent,
  formatRelativeTime,
  localDateInputValue,
  parseAmount,
  parseDate,
} from './format'

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
  it('adds a + sign when signed', () => {
    expect(formatCAD(12.5, { signed: true })).toBe('+$12.50')
    expect(formatCAD(-12.5, { signed: true })).toBe('-$12.50')
    expect(formatCAD(0, { signed: true })).toBe('$0.00')
  })
  it('supports compact notation', () => {
    expect(formatCAD(210_000_000_000, { compact: true })).toBe('$210B')
    expect(formatCAD(3_400_000_000, { compact: true })).toBe('$3.4B')
    expect(formatCAD(45_600_000, { compact: true })).toBe('$45.6M')
  })
  it('renders an em dash for missing or non-finite values', () => {
    expect(formatCAD(undefined)).toBe('—')
    expect(formatCAD(null)).toBe('—')
    expect(formatCAD(Number.NaN)).toBe('—')
    expect(formatCAD(Number.POSITIVE_INFINITY)).toBe('—')
  })
})

describe('formatMoney', () => {
  it('labels USD so it cannot be mistaken for CAD', () => {
    expect(formatMoney(9968.75, 'USD')).toBe('US$9,968.75')
  })
  it('formats CAD with a plain $', () => {
    expect(formatMoney(9968.75, 'CAD')).toBe('$9,968.75')
  })
  it('signs USD gains', () => {
    expect(formatMoney(2158.75, 'USD', { signed: true })).toBe('+US$2,158.75')
  })
})

describe('formatPct (signed, takes fractions)', () => {
  it('formats a positive fraction with + prefix', () => {
    expect(formatPct(0.055)).toBe('+5.50%')
  })
  it('formats a negative fraction', () => {
    expect(formatPct(-0.0325)).toBe('-3.25%')
  })
  it('formats zero without a sign', () => {
    expect(formatPct(0)).toBe('0.00%')
  })
  it('never renders negative zero', () => {
    expect(formatPct(-0.000001)).toBe('0.00%')
  })
  it('respects custom decimal places', () => {
    expect(formatPct(0.123456, 1)).toBe('+12.3%')
  })
  it('renders an em dash for missing values', () => {
    expect(formatPct(undefined)).toBe('—')
    expect(formatPct(Number.NaN)).toBe('—')
  })
})

describe('formatPercent (unsigned, takes fractions)', () => {
  it('formats yields without a sign', () => {
    expect(formatPercent(0.0364)).toBe('3.64%')
  })
  it('respects decimals', () => {
    expect(formatPercent(0.4341, 0)).toBe('43%')
  })
})

describe('formatNumber', () => {
  it('fixes decimals and adds separators', () => {
    expect(formatNumber(1234.5)).toBe('1,234.50')
    expect(formatNumber(0.718, 4)).toBe('0.7180')
  })
  it('renders an em dash for null', () => {
    expect(formatNumber(null)).toBe('—')
  })
})

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-26T12:00:00Z'))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows minutes for recent times', () => {
    expect(formatRelativeTime('2026-03-26T11:30:00Z')).toBe('30m ago')
  })
  it('shows hours for same-day times', () => {
    expect(formatRelativeTime('2026-03-26T09:00:00Z')).toBe('3h ago')
  })
  it('shows days for older times', () => {
    expect(formatRelativeTime('2026-03-24T12:00:00Z')).toBe('2d ago')
  })
  it('shows "just now" for the last minute', () => {
    expect(formatRelativeTime('2026-03-26T12:00:00Z')).toBe('just now')
  })
  it('treats future timestamps (clock skew) as just now instead of negative', () => {
    expect(formatRelativeTime('2026-03-26T12:05:00Z')).toBe('just now')
  })
  it('handles invalid input', () => {
    expect(formatRelativeTime('not a date')).toBe('—')
  })
  it('reads a date-time with an offset as an instant', () => {
    // 11:30 UTC, 30 minutes before "now"
    expect(formatRelativeTime('2026-03-26T11:30:00Z')).toBe('30m ago')
    expect(formatRelativeTime('2026-03-26T08:59:00.786604Z')).toBe('3h ago')
  })
})

describe('parseDate', () => {
  it('reads a date-time with an offset as an instant', () => {
    const utc = Date.UTC(2026, 10, 21, 13, 49, 10)
    expect(parseDate('2026-11-21T13:49:10Z').getTime()).toBe(utc)
    expect(parseDate('2026-11-21T08:49:10-05:00').getTime()).toBe(utc)
    expect(parseDate('2026-11-21T13:49:10.123456Z').getTime()).toBe(utc + 123)
  })
  it('reads a date-time with no offset as the owner\'s day in local time, never shifting it', () => {
    const day = parseDate('2026-10-22T00:00:00')
    expect([day.getFullYear(), day.getMonth(), day.getDate(), day.getHours()]).toEqual([2026, 9, 22, 0])
  })
})

describe('formatDate', () => {
  it('formats ISO date-time strings', () => {
    expect(formatDate('2026-03-26T15:00:00Z')).toBe('Mar 26, 2026')
  })
  it('formats date-only strings as that calendar day in any timezone', () => {
    expect(formatDate('2026-03-01')).toBe('Mar 1, 2026')
  })
  it('runs in a Canadian timezone (guards the tests below against a UTC runner)', () => {
    expect(new Date('2026-01-01T00:00:00Z').getTimezoneOffset()).toBeGreaterThan(0)
  })
  it('does not shift date-only strings back a day (UTC midnight is the previous day in Canada)', () => {
    expect(formatDate('2025-09-01', { month: 'short', year: '2-digit' })).toBe('Sep 25')
    expect(parseDate('2025-09-01').getDate()).toBe(1)
  })
  it('handles invalid input', () => {
    expect(formatDate('')).toBe('—')
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
})

describe('formatEnumLabel', () => {
  it('replaces every underscore, not just the first', () => {
    expect(formatEnumLabel('maximize_when_possible')).toBe('maximize when possible')
  })
})

describe('localDateInputValue', () => {
  it('uses the local calendar date, not the UTC date', () => {
    // 9pm local on Nov 2 — in Canada this is already Nov 3 in UTC.
    expect(localDateInputValue(new Date(2026, 10, 2, 21, 0))).toBe('2026-11-02')
  })
  it('zero-pads month and day', () => {
    expect(localDateInputValue(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})

describe('parseAmount', () => {
  it('parses decimals', () => {
    expect(parseAmount('12.5')).toBe(12.5)
  })
  it('returns 0 for empty or invalid input', () => {
    expect(parseAmount('')).toBe(0)
    expect(parseAmount('abc')).toBe(0)
  })
})
