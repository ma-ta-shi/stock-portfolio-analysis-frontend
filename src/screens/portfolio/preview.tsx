/**
 * What an entry would do, drawn from `EventPreviewResponse` (the server's preview: the position after, the cash before and after,
 * the realised gain, the tax estimate, the contribution room, and the warnings and notes). One registry, drawn by
 * `components/ledger/EntryPreview.tsx`. A spec whose `get` returns null has nothing to say for this entry and is not drawn (a cash
 * entry has no position, a purchase has no gain).
 *
 * Three objects in the response are untyped (`row`, `estimated_tax`, `room`); they are read by their documented keys (gap P-W10).
 * The tax figures are in Canadian dollars: `marginal_rate` is a whole percent (31.48 means 31.48%) and a sale at a loss returns a
 * negative `estimated_tax`, drawn as a saving.
 */
import { defineFields, type ApiFieldKey, type FieldSpec, type NotShown } from '@/lib/fields'
import { formatMoney, formatPercent } from '@/lib/format'
import type { Currency } from '@/lib/ledger-entry'
import type { components } from '@/types/openapi.gen'
import { cad, list } from '../formatters'

export type EventPreview = components['schemas']['EventPreviewResponse']

/** A preview with the currency of the entry it previews (the response does not say). */
export interface PreviewRow {
  preview: EventPreview
  currency: Currency
}

type Dict = Record<string, unknown>
const dict = (value: unknown): Dict => (value && typeof value === 'object' ? (value as Dict) : {})
const num = (source: Dict, key: string): number | null => (typeof source[key] === 'number' ? (source[key] as number) : null)

const position = (r: PreviewRow) => r.preview.position
const gain = (r: PreviewRow) => dict(r.preview.row)
const tax = (r: PreviewRow) => (r.preview.estimated_tax ? dict(r.preview.estimated_tax) : null)

/** "before to after" for one currency of the cash, or null when this entry does not change it. */
function cashChange(r: PreviewRow, currency: Currency) {
  const before = num(dict(r.preview.cash_before), currency)
  const after = num(dict(r.preview.cash_after), currency)
  return before == null || after == null || Math.abs(after - before) < 0.005 ? null : { before, after }
}

/** "before to after" of one registered account's room, or null when the entry does not touch it. */
function roomChange(r: PreviewRow, account: 'tfsa' | 'rrsp') {
  const room = dict(dict(r.preview.room)[account])
  const before = num(room, 'before')
  const after = num(room, 'after')
  return before == null || after == null ? null : { before, after, estimated: room.estimated === true }
}


const SPECS: readonly FieldSpec<PreviewRow>[] = [
  // The position after the entry
  { id: 'shares', label: 'Shares after', source: 'PositionAfterResponse.shares', get: (r) => position(r)?.shares ?? null, format: (v) => (v as number).toLocaleString('en-CA', { maximumFractionDigits: 4 }), places: ['detail'] },
  { id: 'average_cost', label: 'Average cost after', source: 'PositionAfterResponse.average_cost_basis', get: (r) => position(r)?.average_cost_basis ?? null, format: (v, r) => formatMoney(v as number, r.currency), places: ['detail'] },
  { id: 'book_cost', label: 'Book cost after', source: 'PositionAfterResponse.total_book_cost', get: (r) => position(r)?.total_book_cost ?? null, format: (v, r) => formatMoney(v as number, r.currency), places: ['detail'] },
  { id: 'book_cost_cad', label: 'Book cost after (CAD)', source: 'PositionAfterResponse.total_book_cost_cad', get: (r) => (r.currency === 'CAD' ? null : (position(r)?.total_book_cost_cad ?? null)), format: (v) => cad(v), places: ['detail'] },
  { id: 'realised_total', label: 'Realised to date (CAD)', source: 'PositionAfterResponse.total_realized_gain_loss_cad', get: (r) => position(r)?.total_realized_gain_loss_cad ?? null, format: (v) => cad(v, true), places: ['detail'] },
  { id: 'dividends_total', label: 'Dividends received to date (CAD)', source: 'PositionAfterResponse.total_dividends_received_cad', get: (r) => position(r)?.total_dividends_received_cad ?? null, format: (v) => cad(v), places: ['detail'] },
  { id: 'fees_total', label: 'Fees paid to date (CAD)', source: 'PositionAfterResponse.total_fees_paid_cad', get: (r) => position(r)?.total_fees_paid_cad ?? null, format: (v) => cad(v), places: ['detail'] },
  { id: 'closes', label: 'Closes this position', source: 'PositionAfterResponse.is_active', get: (r) => (position(r) && !position(r)!.is_active ? 'Yes' : null), places: ['detail'] },

  // The cash, one line for each currency it changes
  { id: 'cash_cad', label: 'Cash (CAD)', source: ['EventPreviewResponse.cash_before', 'EventPreviewResponse.cash_after'], get: (r) => cashChange(r, 'CAD'), format: (v) => `${cad((v as { before: number }).before)} to ${cad((v as { after: number }).after)}`, places: ['detail'] },
  { id: 'cash_usd', label: 'Cash (USD)', source: ['EventPreviewResponse.cash_before', 'EventPreviewResponse.cash_after'], get: (r) => cashChange(r, 'USD'), format: (v) => `${formatMoney((v as { before: number }).before, 'USD')} to ${formatMoney((v as { after: number }).after, 'USD')}`, places: ['detail'] },

  // A sale: what it realises
  { id: 'gain', label: 'Realised gain or loss', source: 'EventPreviewResponse.row', get: (r) => num(gain(r), 'realized_gain_loss'), format: (v, r) => formatMoney(v as number, r.currency, { signed: true }), places: ['detail'] },
  { id: 'gain_cad', label: 'Realised gain or loss (CAD)', source: 'EventPreviewResponse.row', get: (r) => (r.currency === 'CAD' ? null : num(gain(r), 'realized_gain_loss_cad')), format: (v) => cad(v, true), places: ['detail'] },
  { id: 'denied_loss', label: 'Loss denied (superficial loss, CAD)', source: 'EventPreviewResponse.row', get: (r) => num(gain(r), 'denied_loss_cad'), format: (v) => cad(v), tooltip: 'Added to the cost of the shares bought in the window instead of counting now', places: ['detail'] },
  { id: 'denied_lost', label: 'Of which lost for good (CAD)', source: 'EventPreviewResponse.row', get: (r) => num(gain(r), 'denied_loss_lost_cad'), format: (v) => cad(v), places: ['detail'] },

  // The tax estimate (Trading account sales; needs the profile's rate)
  { id: 'tax_gain', label: 'Capital gain (CAD)', source: 'EventPreviewResponse.estimated_tax', get: (r) => (tax(r) ? num(tax(r)!, 'capital_gain') : null), format: (v) => cad(v, true), places: ['detail'] },
  { id: 'tax_taxable', label: 'Taxable capital gain (CAD)', source: 'EventPreviewResponse.estimated_tax', get: (r) => (tax(r) ? num(tax(r)!, 'taxable_capital_gain') : null), format: (v) => cad(v, true), places: ['detail'] },
  { id: 'tax_rate', label: 'Marginal rate', source: 'EventPreviewResponse.estimated_tax', get: (r) => (tax(r) ? num(tax(r)!, 'marginal_rate') : null), format: (v) => formatPercent((v as number) / 100), tooltip: 'The response gives a whole percent (31.48 means 31.48%)', places: ['detail'] },
  { id: 'tax_estimate', label: 'Estimated tax effect (CAD)', source: 'EventPreviewResponse.estimated_tax', get: (r) => (tax(r) ? num(tax(r)!, 'estimated_tax') : null), format: (v) => ((v as number) < 0 ? `${cad(Math.abs(v as number))} saved` : cad(v)), tooltip: 'A negative figure is a tax saving from a loss', places: ['detail'] },
  { id: 'tax_note', label: 'Tax estimate', source: 'EventPreviewResponse.tax_note', get: (r) => r.preview.tax_note, places: ['detail'] },

  // Contribution room, for the registered accounts the entry touches
  { id: 'room_tfsa', label: 'TFSA room', source: 'EventPreviewResponse.room', get: (r) => roomChange(r, 'tfsa'), format: (v) => `${cad((v as { before: number }).before)} to ${cad((v as { after: number }).after)}${(v as { estimated: boolean }).estimated ? ' (estimated)' : ''}`, places: ['detail'] },
  { id: 'room_rrsp', label: 'RRSP room', source: 'EventPreviewResponse.room', get: (r) => roomChange(r, 'rrsp'), format: (v) => `${cad((v as { before: number }).before)} to ${cad((v as { after: number }).after)}${(v as { estimated: boolean }).estimated ? ' (estimated)' : ''}`, places: ['detail'] },

  // Lists, drawn as lists by EntryPreview (see LIST_IDS)
  { id: 'warnings', label: 'Warnings', source: 'EventPreviewResponse.warnings', get: (r) => r.preview.warnings, format: list, places: ['detail'] },
  { id: 'notes', label: 'Notes', source: 'EventPreviewResponse.notes', get: (r) => r.preview.notes, format: list, places: ['detail'] },
  { id: 'other_effects', label: 'Other effects', source: 'EventPreviewResponse.other_effects', get: (r) => r.preview.other_effects, format: list, places: ['detail'] },
]

/** Every format tolerates a value that is not there (a spec returns null when the entry has nothing to say for it). */
export const PREVIEW_FIELDS = defineFields<PreviewRow>(
  SPECS.map((spec) => (spec.format ? { ...spec, format: (v, r) => (v == null ? '—' : spec.format!(v, r)) } : spec)),
)

/** The specs EntryPreview draws as bulleted lists (warnings in amber) instead of label and value. */
export const LIST_IDS = ['warnings', 'notes', 'other_effects'] as const

export const PREVIEW_NOT_SHOWN: Partial<Record<ApiFieldKey, NotShown>> = {
  'EventPreviewResponse.position': { reason: "Shown through PositionAfterResponse's fields" },
  'PositionAfterResponse.first_buy_date': { reason: 'The holding row shows it after the refresh; an entry rarely changes it' },
  'PositionAfterResponse.last_transaction_date': { reason: 'The entry itself is the last transaction; the holding row shows it after the refresh' },
  'RecordedEventsResponse.transactions': { reason: 'Listed in the "Recorded" step through TRANSACTION_FIELDS' },
}
