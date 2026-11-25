/** The ledger (Transactions tab): every field of a transaction, declared once. Columns, the expanded row and the CSV all read this. */
import { Badge } from '@/components/ui/badge'
import { defineFields, type ApiFieldKey, type NotShown } from '@/lib/fields'
import { formatMoney, formatNumber, formatPct } from '@/lib/format'
import { TONE_TEXT, TX_TYPE_BADGE, TX_TYPE_LABELS, gainLossColor } from '@/lib/labels'
import { cn } from '@/lib/utils'
import type { Transaction } from '@/types/portfolio'
import { cad, day } from '../formatters'

const money = (t: Transaction, v: unknown, signed = false) => formatMoney(v as number | null, t.currency, { signed })

export const TRANSACTION_FIELDS = defineFields<Transaction>([
  { id: 'date', label: 'Date', source: 'TransactionResponse.transaction_date', get: (t) => t.transaction_date, format: day, tooltip: 'The day as you entered it', places: ['column', 'csv'] },
  {
    id: 'stock',
    label: 'Stock',
    source: 'TransactionResponse.stock',
    get: (t) => t.stock?.ticker ?? null,
    format: (v) => (v as string | null) ?? 'Cash',
    places: ['column', 'csv'],
    render: (t) =>
      t.stock ? (
        <>
          <div className="font-medium text-sm">{t.stock.ticker}</div>
          <div className="text-xs text-muted-foreground">{t.stock.name}</div>
        </>
      ) : (
        <span className="text-sm text-muted-foreground">Cash</span>
      ),
  },
  { id: 'account', label: 'Account', source: 'TransactionResponse.account_type', get: (t) => t.account_type.toUpperCase(), places: ['column', 'csv'] },
  {
    id: 'type',
    label: 'Type',
    source: 'TransactionResponse.transaction_type',
    get: (t) => t.transaction_type,
    format: (v) => TX_TYPE_LABELS[v as keyof typeof TX_TYPE_LABELS],
    places: ['column', 'csv'],
    render: (t) => (
      <span className={cn('inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium', TX_TYPE_BADGE[t.transaction_type])}>
        {TX_TYPE_LABELS[t.transaction_type]}
      </span>
    ),
  },
  {
    id: 'shares',
    label: 'Shares',
    source: 'TransactionResponse.shares',
    get: (t) => t.shares,
    format: (v) => (v == null ? '—' : `${(v as number) > 0 ? '+' : ''}${formatNumber(v as number, Number.isInteger(v) ? 0 : 4)}`),
    tooltip: 'Negative for a sale or a transfer out',
    places: ['column', 'csv'],
    render: (t) =>
      t.shares == null ? (
        <span className="text-muted-foreground">—</span>
      ) : (
        <span className={t.shares < 0 ? TONE_TEXT.negative : undefined}>
          {t.shares > 0 ? '+' : ''}
          {formatNumber(t.shares, Number.isInteger(t.shares) ? 0 : 4)}
        </span>
      ),
  },
  { id: 'price', label: 'Price', source: 'TransactionResponse.price_per_share', get: (t) => t.price_per_share, format: (v, t) => money(t, v), places: ['column', 'csv'] },
  { id: 'total', label: 'Total', source: ['TransactionResponse.total_amount', 'TransactionResponse.currency'], get: (t) => t.total_amount, format: (v, t) => money(t, v), places: ['column', 'csv'] },
  { id: 'amount_cad', label: 'Total (CAD)', source: 'TransactionResponse.amount_cad', get: (t) => t.amount_cad, format: (v) => cad(v), tooltip: 'For a US-dollar row, at the rate of the day', places: ['column', 'csv'] },
  { id: 'fees', label: 'Fees', source: 'TransactionResponse.fees', get: (t) => t.fees, format: (v, t) => ((v as number) > 0 ? money(t, v) : '—'), places: ['column', 'csv'] },
  {
    id: 'realised',
    label: 'Realised P&L',
    source: ['TransactionResponse.realized_gain_loss', 'TransactionResponse.realized_gain_loss_pct'],
    get: (t) => t.realized_gain_loss,
    format: (v, t) => money(t, v, true),
    places: ['column', 'csv'],
    render: (t) =>
      t.realized_gain_loss == null ? (
        <span className="text-muted-foreground text-sm">—</span>
      ) : (
        <>
          <div className={cn('text-sm font-medium', gainLossColor(t.realized_gain_loss))}>{money(t, t.realized_gain_loss, true)}</div>
          {t.realized_gain_loss_pct != null && <div className={cn('text-xs', gainLossColor(t.realized_gain_loss))}>{formatPct(t.realized_gain_loss_pct)}</div>}
        </>
      ),
  },
  { id: 'realised_pct', label: 'Realised %', source: 'TransactionResponse.realized_gain_loss_pct', get: (t) => t.realized_gain_loss_pct, format: (v) => formatPct(v as number | null), places: ['csv'] },
  {
    id: 'links',
    label: 'Linked entries',
    source: [
      'TransactionResponse.reverses_transaction_id',
      'TransactionResponse.supersedes_transaction_id',
      'TransactionResponse.move_id',
      'TransactionResponse.in_kind',
      'TransactionResponse.recommendation_id',
      'TransactionResponse.denied_loss_cad',
    ],
    get: (t) => linkLabels(t).join('; '),
    places: ['column', 'csv'],
    render: (t) => (
      <div className="flex gap-1 flex-wrap">
        {linkLabels(t).map((label) => (
          <Badge key={label} variant="outline" className="text-xs font-normal">
            {label}
          </Badge>
        ))}
      </div>
    ),
  },

  { id: 'cost_basis_at_sell', label: 'Cost basis at sale', source: 'TransactionResponse.cost_basis_at_sell', get: (t) => t.cost_basis_at_sell, format: (v, t) => money(t, v), tooltip: 'Per share', places: ['detail', 'csv'] },
  { id: 'realised_cad', label: 'Realised (CAD)', source: 'TransactionResponse.realized_gain_loss_cad', get: (t) => t.realized_gain_loss_cad, format: (v) => cad(v, true), tooltip: 'After a denied loss; the figure that counts for tax', places: ['detail', 'csv'] },
  { id: 'fx_gain_loss', label: 'Currency part (CAD)', source: 'TransactionResponse.fx_gain_loss_cad', get: (t) => t.fx_gain_loss_cad, format: (v) => cad(v, true), places: ['detail', 'csv'] },
  { id: 'denied_loss', label: 'Denied loss (CAD)', source: 'TransactionResponse.denied_loss_cad', get: (t) => t.denied_loss_cad, format: (v) => cad(v), tooltip: 'A loss the superficial-loss rule does not allow now', places: ['detail', 'csv'] },
  { id: 'denied_loss_lost', label: 'Denied loss lost (CAD)', source: 'TransactionResponse.denied_loss_lost_cad', get: (t) => t.denied_loss_lost_cad, format: (v) => cad(v), places: ['detail', 'csv'] },
  { id: 'cost_removed', label: 'Cost removed (CAD)', source: 'TransactionResponse.cost_removed_cad', get: (t) => t.cost_removed_cad, format: (v) => cad(v), places: ['detail', 'csv'] },
  { id: 'fx_rate', label: 'Exchange rate to CAD', source: 'TransactionResponse.fx_rate_to_cad', get: (t) => t.fx_rate_to_cad, format: (v) => (v == null ? '—' : formatNumber(v as number, 4)), places: ['detail', 'csv'] },
  { id: 'fx_rate_date', label: 'Rate of', source: 'TransactionResponse.fx_rate_date', get: (t) => t.fx_rate_date, format: day, places: ['detail', 'csv'] },
  { id: 'fx_rate_refreshed', label: 'Rate fetched', source: 'TransactionResponse.fx_rate_refreshed_at', get: (t) => t.fx_rate_refreshed_at, format: day, places: ['detail', 'csv'] },
  { id: 'fx_spread', label: 'Conversion spread (CAD)', source: 'TransactionResponse.fx_spread_cad', get: (t) => t.fx_spread_cad, format: (v) => cad(v), places: ['detail', 'csv'] },
  { id: 'counter_currency', label: 'Converted to', source: 'TransactionResponse.counter_currency', get: (t) => t.counter_currency, places: ['detail', 'csv'] },
  { id: 'counter_amount', label: 'Converted amount', source: 'TransactionResponse.counter_amount', get: (t) => t.counter_amount, format: (v, t) => formatMoney(v as number | null, t.counter_currency ?? t.currency), places: ['detail', 'csv'] },
  { id: 'withholding', label: 'Tax withheld', source: 'TransactionResponse.withholding_tax', get: (t) => t.withholding_tax, format: (v, t) => money(t, v), places: ['detail', 'csv'] },
  { id: 'tax_year', label: 'Tax year', source: 'TransactionResponse.tax_year', get: (t) => t.tax_year, places: ['detail', 'csv'] },
  { id: 'in_kind', label: 'Moved in kind', source: 'TransactionResponse.in_kind', get: (t) => t.in_kind, places: ['detail', 'csv'] },
  { id: 'move_id', label: 'Move', source: 'TransactionResponse.move_id', get: (t) => t.move_id, places: ['csv'] },
  { id: 'reverses', label: 'Reverses entry', source: 'TransactionResponse.reverses_transaction_id', get: (t) => t.reverses_transaction_id, places: ['detail', 'csv'] },
  { id: 'supersedes', label: 'Replaces entry', source: 'TransactionResponse.supersedes_transaction_id', get: (t) => t.supersedes_transaction_id, places: ['detail', 'csv'] },
  { id: 'reversed_by', label: 'Reversed by', source: 'TransactionResponse.transaction_id', get: (t) => t.reversed_by_transaction_id, tooltip: 'Known only when the reversing row is among those loaded (gap P-T1)', places: ['detail'] },
  { id: 'initiated_by', label: 'Entered by', source: 'TransactionResponse.initiated_by', get: (t) => t.initiated_by, places: ['detail', 'csv'] },
  { id: 'reason_code', label: 'Reason', source: 'TransactionResponse.reason_code', get: (t) => t.reason_code, format: (v) => (v ? String(v).replaceAll('_', ' ') : '—'), places: ['detail', 'csv'] },
  { id: 'recommendation_id', label: 'Followed proposal', source: 'TransactionResponse.recommendation_id', get: (t) => t.recommendation_id, places: ['detail', 'csv'] },
  { id: 'system_outlook', label: 'System outlook at sale', source: 'TransactionResponse.system_outlook_at_sell', get: (t) => t.system_outlook_at_sell, places: ['detail', 'csv'] },
  { id: 'aligned', label: 'Sale agreed with the system', source: 'TransactionResponse.sell_aligned_with_system', get: (t) => t.sell_aligned_with_system, places: ['detail', 'csv'] },
  { id: 'holding_id', label: 'Position', source: 'TransactionResponse.holding_id', get: (t) => t.holding_id, tooltip: 'Opens this position\'s history', places: ['csv'] },
  { id: 'notes', label: 'Notes', source: 'TransactionResponse.notes', get: (t) => t.notes, places: ['detail', 'csv'] },
  { id: 'recorded', label: 'Recorded', source: 'TransactionResponse.created_at', get: (t) => t.created_at, format: day, places: ['detail', 'csv'] },
  { id: 'transaction_id', label: 'Entry id', source: 'TransactionResponse.transaction_id', get: (t) => t.transaction_id, places: ['detail', 'csv'] },
])

/** The badges a row earns from the entries it is linked to. */
export function linkLabels(t: Transaction): string[] {
  const labels: string[] = []
  if (t.reverses_transaction_id) labels.push('Reversal')
  if (t.reversed_by_transaction_id) labels.push('Reversed')
  if (t.supersedes_transaction_id) labels.push('Correction')
  if (t.move_id) labels.push(t.in_kind ? 'Move (in kind)' : 'Move')
  if (t.recommendation_id) labels.push('Followed a proposal')
  if (t.denied_loss_cad) labels.push('Superficial loss')
  return labels
}

export const TRANSACTION_NOT_SHOWN: Partial<Record<ApiFieldKey, NotShown>> = {
  'TransactionResponse.portfolio_id': { reason: 'An id of the portfolio the page is already in' },
}
