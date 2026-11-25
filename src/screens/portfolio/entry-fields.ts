/**
 * The write forms' request fields: every property of `TransactionCreate` (and `EventsCreate`) is either typed or chosen by the
 * owner in at least one form (`ENTRY_FIELDS`, place `input`) or listed in `ENTRY_NOT_SENT` with a reason, so a form cannot silently
 * drop one and the backend cannot add one unnoticed (`field-coverage.test.ts`). `entry-fields.test.ts` ties this list to what the
 * builders in `lib/ledger-entry.ts` actually emit, across the trade, cash and dividend forms.
 */
import type { ApiFieldKey, FieldMeta, NotShown } from '@/lib/fields'

/** Typed or chosen by the owner in the trade, cash or dividend form. */
export const ENTRY_FIELDS: readonly FieldMeta[] = [
  { id: 'account', label: 'Account', source: 'TransactionCreate.account_type', places: ['input'] },
  { id: 'type', label: 'Type of entry', source: 'TransactionCreate.transaction_type', places: ['input'] },
  { id: 'shares', label: 'Shares', source: 'TransactionCreate.shares', places: ['input'] },
  { id: 'price', label: 'Price per share', source: 'TransactionCreate.price_per_share', places: ['input'] },
  { id: 'amount', label: 'Amount', source: 'TransactionCreate.total_amount', places: ['input'] },
  { id: 'fees', label: 'Fees', source: 'TransactionCreate.fees', places: ['input'] },
  { id: 'currency', label: 'Currency', source: 'TransactionCreate.currency', places: ['input'] },
  { id: 'date', label: 'Date', source: 'TransactionCreate.transaction_date', places: ['input'] },
  { id: 'rate', label: 'Exchange rate to CAD', source: 'TransactionCreate.fx_rate_to_cad', places: ['input'] },
  { id: 'withholding', label: 'Tax withheld', source: 'TransactionCreate.withholding_tax', places: ['input'] },
  { id: 'counter_currency', label: 'Currency received', source: 'TransactionCreate.counter_currency', places: ['input'] },
  { id: 'counter_amount', label: 'Amount received', source: 'TransactionCreate.counter_amount', places: ['input'] },
  { id: 'reason', label: 'Reason', source: 'TransactionCreate.reason_code', places: ['input'] },
  { id: 'notes', label: 'Notes', source: 'TransactionCreate.notes', places: ['input'] },
]

/** Fields no form types: the dialog takes them from the holding or the lookup. */
export const SET_BY_DIALOG: Readonly<Record<string, string>> = {
  'TransactionCreate.ticker': "the holding's stock, or the stock the lookup found",
}

export const ENTRY_NOT_SENT: Partial<Record<ApiFieldKey, NotShown>> = {
  ...(Object.fromEntries(
    Object.entries(SET_BY_DIALOG).map(([key, how]) => [key, { reason: `Set by the dialog: ${how}` }]),
  ) as Partial<Record<ApiFieldKey, NotShown>>),
  'TransactionCreate.amount_cad': { reason: 'A USD value is stated by the exchange rate alone; a second way to say the same thing is never sent' },
  'TransactionCreate.in_kind': { reason: 'Only a move between accounts sets it' },
  'TransactionCreate.initiated_by': { reason: 'The API default, the owner, is right for every form' },
  'TransactionCreate.tax_year': { reason: "Defaults to the entry's year", gap: 'P-W11' },
  'TransactionCreate.recommendation_id': { reason: 'Proposals are shown by the Optimizer ticket', gap: 'P-W12' },
  'EventsCreate.events': { reason: 'Built by eventsBody (lib/ledger-entry.ts) from the entries' },
}
