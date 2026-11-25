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
  // An opening balance was bought before the record began, so no day's rate can be looked up for it: a US one must state the rate.
  if (kind === 'opening_balance' && currency === 'USD' && !(input.rate != null && input.rate > 0)) return null
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

export type CashKind = 'contribution' | 'withdrawal' | 'fee' | 'interest' | 'conversion'

export interface CashInput {
  kind: CashKind
  account: AccountType
  /** What went in or out (for a conversion, what left), in `currency`. */
  amount: number
  currency: Currency
  date: string
  /** A conversion only: what arrived. */
  counter?: { currency: Currency; amount: number }
  /** CAD per USD for a US row; never sent for a conversion (the API always uses the Bank of Canada's rate to measure its cost). */
  rate?: number
  reason?: ReasonCode | ''
  notes?: string
}

/** A contribution, withdrawal, fee, interest or conversion in one account; `null` until the inputs are valid. */
export function cashEntry(input: CashInput): EntryBody | null {
  const { kind, account, amount, currency, date, counter } = input
  if (!(amount > 0) || !isDay(date)) return null
  if (kind === 'conversion' && !(counter && counter.amount > 0 && counter.currency !== currency)) return null
  const body: EntryBody = {
    account_type: account,
    transaction_type: kind,
    total_amount: round2(amount),
    currency,
    transaction_date: date,
    ...optionalFields(input),
  }
  if (kind === 'conversion') {
    body.counter_currency = counter!.currency
    body.counter_amount = round2(counter!.amount)
  } else if (currency === 'USD' && input.rate != null && input.rate > 0) {
    body.fx_rate_to_cad = input.rate
  }
  return body
}

export interface DividendInput {
  account: AccountType
  ticker: string
  currency: Currency
  /** The dividend before tax, in `currency`. */
  gross: number
  /** Tax withheld, in `currency`; zero or blank for none. */
  withholding?: number
  /** The day it was paid. */
  date: string
  /** Shares bought with it, at the price paid. */
  reinvest?: { shares: number; price: number }
  rate?: number
  notes?: string
}

/** What is wrong with a dividend entry, in words for the form, or null: tax above the dividend, or more reinvested than was paid. */
export function dividendProblem(input: Pick<DividendInput, 'gross' | 'withholding' | 'reinvest'>): string | null {
  const withholding = input.withholding ?? 0
  if (withholding > input.gross + 1e-9) return 'The tax withheld is more than the dividend'
  if (input.reinvest && round2(input.reinvest.shares * input.reinvest.price) > round2(input.gross - withholding) + 1e-9) return 'Reinvests more than the dividend paid'
  return null
}

/**
 * A dividend row (no shares: the gross is its `total_amount`) and, when it was reinvested, the `drip` row that spent it, in the same
 * call so the cash nets out. `null` until the inputs are valid.
 */
export function dividendEntries(input: DividendInput): EntryBody[] | null {
  const { account, ticker, currency, gross, date, reinvest } = input
  if (!(gross > 0) || !isDay(date) || !ticker || dividendProblem(input)) return null
  if (reinvest && !(reinvest.shares > 0 && reinvest.price > 0)) return null
  const rate = currency === 'USD' && input.rate != null && input.rate > 0 ? { fx_rate_to_cad: input.rate } : {}
  const withholding = input.withholding ?? 0
  const dividend: EntryBody = {
    account_type: account,
    transaction_type: 'dividend',
    ticker,
    total_amount: round2(gross),
    currency,
    transaction_date: date,
    ...(withholding > 0 ? { withholding_tax: round2(withholding) } : {}),
    ...rate,
    ...optionalFields({ notes: input.notes }),
  }
  if (!reinvest) return [dividend]
  const drip: EntryBody = {
    account_type: account,
    transaction_type: 'drip',
    ticker,
    shares: reinvest.shares,
    price_per_share: reinvest.price,
    total_amount: round2(reinvest.shares * reinvest.price),
    currency,
    transaction_date: date,
    ...rate,
  }
  return [dividend, drip]
}

/** The body of `POST events` and `events/preview`: one to ten entries of one security (the API's rule). */
export function eventsBody(entries: EntryBody[]) {
  return { events: entries }
}
