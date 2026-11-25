/**
 * The dividends the system found for the portfolio (`GET /api/portfolios/{id}/dividends`): what is waiting for the owner to confirm
 * or dismiss, and what was decided. Columns, the expanded row and the Reopen rule all read this registry.
 */
import { defineFields, type ApiFieldKey, type NotShown } from '@/lib/fields'
import { formatMoney } from '@/lib/format'
import { DIVIDEND_STATUS_LABELS } from '@/lib/labels'
import { asFraction } from '@/lib/units'
import type { components } from '@/types/openapi.gen'
import { day, list, plainPct, text } from '../formatters'

type Api = components['schemas']
export type ApiDividendEvent = Api['DividendEventResponse']

/** A dividend event with its withholding rate as a fraction (the API serves a whole percent). */
export interface DividendEvent extends ApiDividendEvent {
  withholding_rate: number | null
}

export function mapDividendEvent(e: ApiDividendEvent): DividendEvent {
  return { ...e, withholding_rate: asFraction('DividendEventResponse.withholding_rate_pct', e.withholding_rate_pct) }
}

const money = (e: DividendEvent, v: unknown) => formatMoney(v as number | null, e.currency)

export const DIVIDEND_FIELDS = defineFields<DividendEvent>([
  {
    id: 'stock',
    label: 'Stock',
    source: 'DividendEventResponse.stock',
    get: (e) => e.stock.ticker,
    places: ['column'],
    render: (e) => (
      <>
        <div className="font-medium text-sm">{e.stock.ticker}</div>
        <div className="text-xs text-muted-foreground">{e.stock.name}</div>
      </>
    ),
  },
  { id: 'account', label: 'Account', source: 'DividendEventResponse.account_type', get: (e) => e.account_type.toUpperCase(), places: ['column'] },
  { id: 'ex_date', label: 'Ex-date', source: 'DividendEventResponse.ex_date', get: (e) => e.ex_date, format: day, tooltip: 'You must have held the shares before this day', places: ['column'] },
  { id: 'payment_date', label: 'Pays', source: 'DividendEventResponse.payment_date', get: (e) => e.payment_date, format: day, tooltip: 'A dividend can be confirmed from its payment day', places: ['column'] },
  {
    id: 'per_share',
    label: 'Per share',
    source: ['DividendEventResponse.amount_per_share', 'DividendEventResponse.currency'],
    get: (e) => e.amount_per_share,
    format: (v, e) => money(e, v),
    places: ['detail'],
  },
  { id: 'shares_at_ex', label: 'Shares at ex-date', source: 'DividendEventResponse.shares_at_ex', get: (e) => e.shares_at_ex, places: ['detail'] },
  { id: 'gross', label: 'Expected before tax', source: 'DividendEventResponse.expected_gross', get: (e) => e.expected_gross, format: (v, e) => money(e, v), places: ['column'] },
  {
    id: 'withholding',
    label: 'Tax withheld',
    source: ['DividendEventResponse.expected_withholding', 'DividendEventResponse.withholding_rate_pct'],
    get: (e) => e.expected_withholding,
    format: (v, e) => `${money(e, v)} (${plainPct(e.withholding_rate)})`,
    places: ['detail'],
  },
  { id: 'net', label: 'Expected net', source: 'DividendEventResponse.expected_net', get: (e) => e.expected_net, format: (v, e) => money(e, v), places: ['column'] },
  {
    id: 'reinvest',
    label: 'Planned reinvestment',
    source: ['DividendEventResponse.planned_reinvest_price', 'DividendEventResponse.planned_reinvest_shares', 'DividendEventResponse.planned_reinvest_date'],
    get: (e) => e.planned_reinvest_shares,
    format: (v, e) => (v == null ? 'None' : `${v} shares at ${money(e, e.planned_reinvest_price)} on ${day(e.planned_reinvest_date)}`),
    places: ['detail'],
  },
  {
    id: 'status',
    label: 'Status',
    source: 'DividendEventResponse.status',
    get: (e) => e.status,
    format: (v) => DIVIDEND_STATUS_LABELS[v as DividendEvent['status']],
    places: ['column'],
  },
  { id: 'source', label: 'Found by', source: 'DividendEventResponse.source', get: (e) => e.source, format: text, places: ['detail'] },
  { id: 'flags', label: 'Flags', source: 'DividendEventResponse.flags', get: (e) => e.flags, format: list, places: ['detail'] },
  {
    id: 'decided',
    label: 'Decided',
    source: ['DividendEventResponse.decided_by', 'DividendEventResponse.decided_at'],
    get: (e) => e.decided_at,
    format: (v, e) => (v ? `${day(v)} by ${e.decided_by ?? 'unknown'}` : 'Not yet'),
    places: ['detail'],
  },
  { id: 'note', label: 'Note', source: 'DividendEventResponse.note', get: (e) => e.note, format: text, places: ['detail'] },
])

export const DIVIDEND_NOT_SHOWN: Partial<Record<ApiFieldKey, NotShown>> = {
  'DividendEventResponse.event_id': { reason: 'An id: the route parameter of Confirm, Dismiss and Reopen, not a figure' },
  'DividendEventResponse.portfolio_id': { reason: 'The portfolio the page is already showing' },
  'DividendEventResponse.dividend_transaction_id': { reason: 'An id: the ledger row it became is found in Transactions' },
  'DividendEventResponse.drip_transaction_id': { reason: 'An id: the ledger row it became is found in Transactions' },
  'DividendEventResponse.detected_at': { reason: 'Housekeeping: when the system found the dividend' },
  'DividendEventResponse.updated_at': { reason: 'Housekeeping: when the row last changed' },
  'DividendConfirmedResponse.event': { reason: 'Repeats the dividend row, which the refreshed panel shows with its new status' },
  'DividendConfirmedResponse.transactions': { reason: 'Listed in the "Recorded" step through TRANSACTION_FIELDS' },
  'DividendConfirmedResponse.warnings': { reason: 'Shown by the preview before confirming (a probable duplicate); the recorded answer repeats them' },
}
