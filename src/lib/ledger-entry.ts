/**
 * Builds the request bodies the ledger takes (`TransactionCreate` inside `{ events: [...] }`) from what the owner typed. Pure:
 * no React, no network. Each builder returns `null` while the inputs are not valid, so a form can hold "no body yet" and the
 * shell can keep Review disabled.
 *
 * Rules every builder follows (the API's, checked in the seed tests): a date is the `YYYY-MM-DD` string the owner picked (never
 * `toISOString()`, which is UTC midnight and the previous day in Canada); a sale carries negative shares and a positive
 * `total_amount`; `total_amount` of a stock row is shares x price rounded to cents; fees travel separately and only when above
 * zero; a USD value is stated by `fx_rate_to_cad` alone (`amount_cad` is never sent); empty optional fields are left out so the
 * API's defaults apply.
 */
import type { components } from '@/types/openapi.gen'
import type { AccountType } from '@/types/user'

type TransactionCreate = components['schemas']['TransactionCreate']

/** A `TransactionCreate` without the three fields the API defaults (`in_kind`, `initiated_by`) or that may be left out (`fees`). */
export type EntryBody = Omit<TransactionCreate, 'in_kind' | 'initiated_by' | 'fees'> & { fees?: number }
export type ReasonCode = NonNullable<TransactionCreate['reason_code']>
export type Currency = TransactionCreate['currency']

export interface TradeInput {
  kind: 'buy' | 'sell' | 'opening_balance'
  account: AccountType
  ticker: string
  currency: Currency
  /** As typed: positive. A sale is sent negative. */
  shares: number
  price: number
  fees?: number
  /** The day, `YYYY-MM-DD`. */
  date: string
  /** CAD per USD, typed by the owner; used only for a USD row. */
  rate?: number
  reason?: ReasonCode | ''
  notes?: string
  /** What the position holds, so a sale cannot exceed it. */
  maxShares?: number
}

export const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100

/** True for a real calendar day written as `YYYY-MM-DD`. */
export function isDay(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
}

/** The optional fields every entry shares: only what was filled in is sent. */
export function optionalFields(input: { fees?: number; reason?: ReasonCode | ''; notes?: string }) {
  const out: Pick<EntryBody, 'fees' | 'reason_code' | 'notes'> = {}
  if (input.fees != null && input.fees > 0) out.fees = round2(input.fees)
  if (input.reason) out.reason_code = input.reason
  const notes = input.notes?.trim()
  if (notes) out.notes = notes
  return out
}

/** A buy, a sale or an opening balance of one stock in one account; `null` until the inputs are valid. */
export function tradeEntry(input: TradeInput): EntryBody | null {
  const { kind, account, ticker, currency, shares, price, date } = input
  if (!(shares > 0) || !(price > 0) || !isDay(date) || !ticker) return null
  if (kind === 'sell' && input.maxShares !== undefined && shares > input.maxShares + 1e-9) return null
  const body: EntryBody = {
    account_type: account,
    transaction_type: kind,
    ticker,
    shares: kind === 'sell' ? -shares : shares,
    price_per_share: price,
    total_amount: round2(shares * price),
    currency,
    transaction_date: date,
    ...optionalFields({ ...input, fees: kind === 'opening_balance' ? 0 : input.fees }),
  }
  if (currency === 'USD' && input.rate != null && input.rate > 0) body.fx_rate_to_cad = input.rate
  return body
}

/** The body of `POST events` and `events/preview`: one to ten entries of one security (the API's rule). */
export function eventsBody(entries: EntryBody[]) {
  return { events: entries }
}
