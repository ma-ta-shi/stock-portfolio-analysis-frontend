/**
 * The write forms' request fields: every property of `TransactionCreate` (and `EventsCreate`) and `DividendCorrections` is either
 * typed or chosen by the owner in at least one form (`ENTRY_FIELDS`, place `input`; one field may feed several requests, so its source
 * lists each), set by the dialog (`SET_BY_DIALOG`) or listed in `ENTRY_NOT_SENT` with a reason, so a form cannot silently drop one and
 * the backend cannot add one unnoticed (`field-coverage.test.ts`). `entry-fields.test.ts` ties this list to what the builders in
 * `lib/ledger-entry.ts` actually emit, one request family at a time.
 */
import type { ApiFieldKey, FieldMeta, NotShown } from '@/lib/fields'

/** Typed or chosen by the owner in the Buy, Sell, Add Stock, Log dividend, Correct and dividend-confirmation forms. */
export const ENTRY_FIELDS: readonly FieldMeta[] = [
  { id: 'account', label: 'Account', source: 'TransactionCreate.account_type', places: ['input'] },
  { id: 'shares', label: 'Shares', source: 'TransactionCreate.shares', places: ['input'] },
  { id: 'price', label: 'Price per share', source: 'TransactionCreate.price_per_share', places: ['input'] },
  { id: 'amount', label: 'Dividend amount', source: 'TransactionCreate.total_amount', places: ['input'] },
  { id: 'fees', label: 'Fees', source: 'TransactionCreate.fees', places: ['input'] },
  { id: 'date', label: 'Date', source: 'TransactionCreate.transaction_date', places: ['input'] },
  { id: 'rate', label: 'Exchange rate to CAD', source: 'TransactionCreate.fx_rate_to_cad', places: ['input'] },
  { id: 'withholding', label: 'Tax withheld', source: ['TransactionCreate.withholding_tax', 'DividendCorrections.withholding_tax'], places: ['input'] },

  // Confirming a waiting dividend (what the owner changes; blank keeps the calculated figure)
  { id: 'dividend_gross', label: 'Dividend received, before tax', source: 'DividendCorrections.gross', places: ['input'] },
  { id: 'payment_date', label: 'Payment date', source: 'DividendCorrections.payment_date', places: ['input'] },
  { id: 'reinvest', label: 'Reinvest', source: 'DividendCorrections.reinvest', places: ['input'] },
  { id: 'reinvest_shares', label: 'Shares bought', source: 'DividendCorrections.reinvest_shares', places: ['input'] },
  { id: 'reinvest_price', label: 'Reinvestment price', source: 'DividendCorrections.reinvest_price', places: ['input'] },
  { id: 'reinvest_date', label: 'Reinvestment date', source: 'DividendCorrections.reinvest_date', places: ['input'] },
]

/** Fields no form types: the dialog takes them from the holding, the lookup or the action. */
export const SET_BY_DIALOG: Readonly<Record<string, string>> = {
  'TransactionCreate.ticker': "the holding's stock, or the stock the lookup found",
  'TransactionCreate.transaction_type': 'the dialog: buy, sell, opening balance, dividend or drip',
  'TransactionCreate.currency': "the stock's currency",
}

export const ENTRY_NOT_SENT: Partial<Record<ApiFieldKey, NotShown>> = {
  ...(Object.fromEntries(
    Object.entries(SET_BY_DIALOG).map(([key, how]) => [key, { reason: `Set by the dialog: ${how}` }]),
  ) as Partial<Record<ApiFieldKey, NotShown>>),
  'TransactionCreate.amount_cad': { reason: 'A USD value is stated by the exchange rate alone; a second way to say the same thing is never sent' },
  'TransactionCreate.in_kind': { reason: 'Only a move between accounts sets it; moves are not in the original design' },
  'TransactionCreate.initiated_by': { reason: 'The API default, the owner, is right for every form' },
  'TransactionCreate.tax_year': { reason: "Defaults to the entry's year", gap: 'P-W11' },
  'TransactionCreate.recommendation_id': { reason: 'Never sent: the optimizer is advice only for the user, and following a suggestion is not tracked (owner)' },
  'TransactionCreate.reason_code': { reason: 'Not sent: the owner gives no reason for a trade (owner decision 2026-11-25)' },
  'TransactionCreate.notes': { reason: 'Not sent: the original forms had no notes field' },
  'TransactionCreate.counter_currency': { reason: 'Only a currency conversion carries it; entering cash and conversions is not in the original design' },
  'TransactionCreate.counter_amount': { reason: 'Only a currency conversion carries it; entering cash and conversions is not in the original design' },
  'DividendCorrections.note': { reason: 'Not sent: the original forms had no notes field' },
  'EventsCreate.events': { reason: 'Built by eventsBody (lib/ledger-entry.ts) from the entries' },
}
