/**
 * The one shell every ledger write goes through: fields, Review, Record, errors and the "Recorded" step.
 *
 * - Review asks the server what the entry would do (`useLedgerPreview`) and shows it (`EntryPreview`). Record is enabled only for
 *   the exact body that was reviewed: any edit hides the preview and asks for a new Review, so what is recorded is what was shown.
 * - Record is never enabled while a request is pending, and once it succeeds the panel shows what was recorded and nothing can be
 *   submitted again. A fast double click lands two clicks before the button re-renders disabled, so a synchronous latch (`sending`)
 *   lets only the first through: otherwise the second request meets the server's 30-second duplicate guard and the panel would report
 *   a duplicate for an entry that was in fact recorded. The server's guard is the second line of defence.
 * - A confirm-only action (reverse, remove) passes no `previewRoute`: there is nothing to review, so Record is the only button.
 * - Nothing is edited in the cache by hand: `useLedgerRecord` refreshes every portfolio query once the server confirms.
 */
import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { EntryPreview } from '@/components/ledger/EntryPreview'
import { useLedgerPreview, useLedgerRecord } from '@/hooks/use-portfolio'
import { getErrorMessage } from '@/lib/api'
import { fieldText } from '@/lib/fields'
import { LEDGER, type LedgerRoute } from '@/lib/ledger-routes'
import type { Currency } from '@/lib/ledger-entry'
import { mapTransactions, type ApiTransaction } from '@/lib/portfolio-mappers'
import { TRANSACTION_FIELDS } from '@/screens/portfolio/ledger'

/** The columns of a recorded entry the panel lists (ids in the transaction registry). */
const RECORDED_IDS = ['date', 'stock', 'type', 'total'] as const

export interface LedgerPanelProps {
  /** What the entry acts on (the position's figures), above the form; hidden once recorded, when it would be out of date. */
  summary?: ReactNode
  /** The form fields. */
  children?: ReactNode
  /** The request body; `null` while the inputs are not valid, `undefined` for an action with no body. */
  body: unknown
  /** Placeholders of the routes (`{ id: holding_id }`). */
  params?: Record<string, string>
  /** The preview route; `null` for a confirm-only action. */
  previewRoute: LedgerRoute | null
  recordRoute: LedgerRoute
  /** The entry's currency, for drawing the preview (the response does not say). */
  currency?: Currency
  /** The button that records, for example "Buy shares". */
  submitLabel: string
  destructive?: boolean
  /** Called by Cancel and by Done; the caller closes the dialog. */
  onDone: () => void
}

export function LedgerPanel({ summary, children, body, params, previewRoute, recordRoute, currency = 'CAD', submitLabel, destructive = false, onDone }: LedgerPanelProps) {
  const preview = useLedgerPreview(previewRoute ?? LEDGER.eventsPreview)
  const record = useLedgerRecord(recordRoute)
  // The body a successful review was made for, as text: Record needs the current body to equal it.
  const [reviewedFor, setReviewedFor] = useState<string | null>(null)
  const sending = useRef(false)

  const valid = body !== null
  const current = JSON.stringify(body ?? null)
  const reviewed = previewRoute === null || (reviewedFor === current && preview.isSuccess)
  const busy = preview.isPending || record.isPending

  function review() {
    if (!valid || busy || sending.current) return
    sending.current = true
    record.reset()
    preview.mutate({ params, body }, { onSuccess: () => setReviewedFor(current), onSettled: () => { sending.current = false } })
  }

  function doRecord() {
    if (!valid || !reviewed || busy || sending.current) return
    sending.current = true
    record.mutate({ params, body }, { onSettled: () => { sending.current = false } })
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (reviewed) doRecord()
    else review()
  }

  const recorded = record.data as { transactions?: ApiTransaction[] } | undefined
  if (record.isSuccess) {
    const rows = mapTransactions(recorded?.transactions ?? [])
    return (
      <div className="space-y-3">
        <p role="status" className="text-sm font-medium">
          Recorded{rows.length ? ` ${rows.length} ${rows.length === 1 ? 'entry' : 'entries'}` : ''}.
        </p>
        {rows.length > 0 && (
          <ul className="rounded-md bg-muted/40 px-3 py-2 text-xs space-y-1" aria-label="Recorded entries">
            {rows.map((row) => (
              <li key={row.transaction_id}>
                {RECORDED_IDS.map((id) => {
                  const spec = TRANSACTION_FIELDS.find((s) => s.id === id)!
                  return fieldText(spec, row)
                }).join(' · ')}
              </li>
            ))}
          </ul>
        )}
        <div className="flex justify-end">
          <Button type="button" onClick={onDone}>
            Done
          </Button>
        </div>
      </div>
    )
  }

  const error = record.isError ? record.error : preview.isError ? preview.error : null
  const showPreview = previewRoute !== null && reviewedFor === current && preview.data

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {summary}
      {children}
      {showPreview && <EntryPreview preview={preview.data} currency={currency} />}
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {getErrorMessage(error, { write: true })}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        {previewRoute !== null && !reviewed && (
          <Button type="submit" disabled={!valid || busy}>
            {preview.isPending ? 'Reviewing…' : 'Review'}
          </Button>
        )}
        {reviewed && (
          <Button type="submit" variant={destructive ? 'destructive' : 'default'} disabled={!valid || busy}>
            {record.isPending ? 'Recording…' : submitLabel}
          </Button>
        )}
      </div>
    </form>
  )
}
