/**
 * The write forms' request fields: every property of `TransactionCreate` (and `EventsCreate`) is either typed by the owner
 * (`ENTRY_FIELDS`, place `input`) or listed in `ENTRY_NOT_SENT` with a reason, so a form cannot silently drop one and the backend
 * cannot add one unnoticed (`field-coverage.test.ts`). `entry-fields.test.ts` ties this list to what the builders in
 * `lib/ledger-entry.ts` actually emit.
 */
import type { ApiFieldKey, FieldMeta, NotShown } from '@/lib/fields'

/** Typed by the owner in the trade form (buy, sell, opening balance). */
export const ENTRY_FIELDS: readonly FieldMeta[] = [
  { id: 'shares', label: 'Shares', source: 'TransactionCreate.shares', places: ['input'] },
  { id: 'price', label: 'Price per share', source: 'TransactionCreate.price_per_share', places: ['input'] },
  { id: 'fees', label: 'Fees', source: 'TransactionCreate.fees', places: ['input'] },
  { id: 'date', label: 'Transaction date', source: 'TransactionCreate.transaction_date', places: ['input'] },
  { id: 'rate', label: 'Exchange rate to CAD', source: 'TransactionCreate.fx_rate_to_cad', places: ['input'] },
  { id: 'reason', label: 'Reason', source: 'TransactionCreate.reason_code', places: ['input'] },
  { id: 'notes', label: 'Notes', source: 'TransactionCreate.notes', places: ['input'] },
]

/** Fields the dialog sets itself rather than the owner typing them; the builders emit them. */
export const SET_BY_DIALOG: Readonly<Record<string, string>> = {
  'TransactionCreate.account_type': "the holding's account",
  'TransactionCreate.transaction_type': 'buy, sell or opening balance, by which button opened the dialog',
  'TransactionCreate.ticker': "the holding's stock",
  'TransactionCreate.currency': "the stock's currency",
  'TransactionCreate.total_amount': 'shares x price, rounded to cents',
}

const NEXT_PR = 'Not entered in the trade form: the cash and dividend forms send it (the next PR)'

export const ENTRY_NOT_SENT: Partial<Record<ApiFieldKey, NotShown>> = {
  ...(Object.fromEntries(
    Object.entries(SET_BY_DIALOG).map(([key, how]) => [key, { reason: `Set by the dialog: ${how}` }]),
  ) as Partial<Record<ApiFieldKey, NotShown>>),
  'TransactionCreate.amount_cad': { reason: 'A USD value is stated by the exchange rate alone; a second way to say the same thing is never sent' },
  'TransactionCreate.in_kind': { reason: 'Only a move between accounts sets it' },
  'TransactionCreate.initiated_by': { reason: 'The API default, the owner, is right for every form' },
  'TransactionCreate.tax_year': { reason: "Defaults to the entry's year", gap: 'P-W11' },
  'TransactionCreate.recommendation_id': { reason: 'Proposals are shown by the Optimizer ticket', gap: 'P-W12' },
  'TransactionCreate.withholding_tax': { reason: NEXT_PR },
  'TransactionCreate.counter_currency': { reason: NEXT_PR },
  'TransactionCreate.counter_amount': { reason: NEXT_PR },
  'EventsCreate.events': { reason: 'Built by eventsBody (lib/ledger-entry.ts) from the entries' },
}
