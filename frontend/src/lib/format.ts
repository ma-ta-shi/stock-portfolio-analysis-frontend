/**
 * Display formatting. All functions return '—' for null/undefined/non-finite input,
 * so callers never render "NaN%" or "$Infinity".
 *
 * Units convention: the API returns ratios as fractions (0.125 = 12.5%).
 * `formatPct` / `formatPercent` take those fractions directly — never multiply by 100.
 */
import type { CurrencyCode } from '@/types'

const LOCALE = 'en-CA'
const EMPTY = '—'

type Num = number | null | undefined

function isNum(value: Num): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

const currencyFormatters = new Map<string, Intl.NumberFormat>()
function currencyFormatter(currency: CurrencyCode, signed: boolean, compact: boolean) {
  const key = `${currency}|${signed}|${compact}`
  let f = currencyFormatters.get(key)
  if (!f) {
    f = new Intl.NumberFormat(LOCALE, {
      style: 'currency',
      currency,
      signDisplay: signed ? 'exceptZero' : 'auto',
      ...(compact
        ? { notation: 'compact', maximumSignificantDigits: 3 }
        : { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    })
    currencyFormatters.set(key, f)
  }
  return f
}

interface MoneyOptions {
  /** Prefix positive values with "+" (for gains, changes). */
  signed?: boolean
  /** Compact notation with 3 significant digits, e.g. $210B, $3.4B, $45.6M. */
  compact?: boolean
}

/**
 * Format an amount in its own currency. In the en-CA locale CAD renders as "$1,234.56"
 * and USD as "US$1,234.56", so the two can never be confused.
 */
export function formatMoney(value: Num, currency: CurrencyCode, options: MoneyOptions = {}): string {
  if (!isNum(value)) return EMPTY
  return currencyFormatter(currency, options.signed ?? false, options.compact ?? false).format(value)
}

export function formatCAD(value: Num, options?: MoneyOptions): string {
  return formatMoney(value, 'CAD', options)
}

const percentFormatters = new Map<string, Intl.NumberFormat>()
function percentFormatter(decimals: number, signed: boolean) {
  const key = `${decimals}|${signed}`
  let f = percentFormatters.get(key)
  if (!f) {
    f = new Intl.NumberFormat(LOCALE, {
      style: 'percent',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      signDisplay: signed ? 'exceptZero' : 'auto',
    })
    percentFormatters.set(key, f)
  }
  return f
}

/** Signed percent change from a fraction: 0.125 → "+12.50%", -0.03 → "-3.00%", 0 → "0.00%". */
export function formatPct(fraction: Num, decimals = 2): string {
  if (!isNum(fraction)) return EMPTY
  return percentFormatter(decimals, true).format(fraction)
}

/** Unsigned percent level from a fraction (yields, rates): 0.0364 → "3.64%". */
export function formatPercent(fraction: Num, decimals = 2): string {
  if (!isNum(fraction)) return EMPTY
  return percentFormatter(decimals, false).format(fraction)
}

/** Plain number with fixed decimals, e.g. a per-share price without a currency symbol. */
export function formatNumber(value: Num, decimals = 2): string {
  if (!isNum(value)) return EMPTY
  return value.toLocaleString(LOCALE, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

/** "5m ago", "3h ago", "2d ago". Future timestamps (clock skew) read as "just now". */
export function formatRelativeTime(isoString: string, now: number = Date.now()): string {
  const time = new Date(isoString).getTime()
  if (Number.isNaN(time)) return EMPTY
  const diff = now - time
  if (diff < 60_000) return 'just now'
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(diff / 3_600_000)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(diff / 86_400_000)}d ago`
}

/**
 * "Mar 24, 2026". Date-only strings ("2026-03-24") are formatted as that calendar day;
 * `new Date('2026-03-24')` would be UTC midnight and show the previous day in Canada.
 */
export function formatDate(isoString: string): string {
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(isoString)
  const date = dateOnly ? new Date(`${isoString}T00:00:00`) : new Date(isoString)
  if (Number.isNaN(date.getTime())) return EMPTY
  return date.toLocaleDateString(LOCALE, { month: 'short', day: 'numeric', year: 'numeric' })
}

/** "fundamental_analyst" → "Fundamental Analyst" */
export function formatAgentName(name: string): string {
  return name
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/** "medium_term" → "medium term" */
export function formatEnumLabel(value: string): string {
  return value.replaceAll('_', ' ')
}

/** Today's date in the user's local timezone as YYYY-MM-DD (for <input type="date">). */
export function localDateInputValue(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Parse a numeric text field; empty or invalid input becomes 0. */
export function parseAmount(value: string): number {
  const n = Number.parseFloat(value)
  return Number.isFinite(n) ? n : 0
}
