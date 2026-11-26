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
  const time = parseDate(isoString).getTime()
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
 * Parse an API date string. Date-only strings ("2026-03-24") become local midnight of
 * that calendar day — `new Date('2026-03-24')` is UTC midnight, which is the *previous*
 * day anywhere in Canada. Always use this instead of `new Date(apiString)` for display.
 *
 * A date-time has one of two meanings, and the API says which by its ending. With an offset ("2026-11-21T13:49:10Z", the form
 * of every system time) it is an instant and is read as one. With none ("2026-10-22T00:00:00": a transaction date, a room
 * "as of" date, a first buy) it is a day the owner wrote and is read as that day in local time, so a sale on the 22nd stays the
 * 22nd. Reading it as UTC would show the 21st in Toronto.
 */
export function parseDate(value: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T00:00:00`)
  return new Date(value) // an offset makes it an instant; none makes it the owner's day, in local time
}

/** "Mar 24, 2026" by default; pass `options` for other shapes (e.g. { month: 'short', day: 'numeric' }). */
export function formatDate(
  value: string,
  options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' },
): string {
  const date = parseDate(value)
  if (Number.isNaN(date.getTime())) return EMPTY
  return date.toLocaleDateString(LOCALE, options)
}

/** "medium_term" → "medium term" */
export function formatEnumLabel(value: string): string {
  return value.replaceAll('_', ' ')
}

/** Today's date in the user's local timezone as YYYY-MM-DD (for <input type="date">). */
/** The `YYYY-MM-DD` day this many days after today (before it when negative). */
export const dayFromToday = (days: number) => localDateInputValue(new Date(Date.now() + days * 86_400_000))

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
