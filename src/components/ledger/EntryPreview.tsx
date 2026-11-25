import { AlertTriangle } from 'lucide-react'
import { fieldText, fieldsFor } from '@/lib/fields'
import type { Currency } from '@/lib/ledger-entry'
import { TONE_TEXT, gainLossColor } from '@/lib/labels'
import { cn } from '@/lib/utils'
import { LIST_IDS, PREVIEW_FIELDS, type EventPreview, type PreviewRow } from '@/screens/portfolio/preview'

/** The specs whose value is a gain or a loss, drawn green or red. */
const SIGNED = new Set(['gain', 'gain_cad', 'realised_total'])

/**
 * What an entry would do, as the server worked it out (`useLedgerPreview`): drawn from the preview registry, so it shows exactly
 * the fields the registry lists and nothing computed in the browser. A line the entry has nothing to say for is left out.
 */
export function EntryPreview({ preview, currency }: { preview: EventPreview; currency: Currency }) {
  const row: PreviewRow = { preview, currency }
  const specs = fieldsFor(PREVIEW_FIELDS, 'detail')
  const lines = specs.filter((spec) => !(LIST_IDS as readonly string[]).includes(spec.id) && spec.get(row) != null)
  const lists = specs.filter((spec) => (LIST_IDS as readonly string[]).includes(spec.id) && (spec.get(row) as string[]).length > 0)

  return (
    <div className="space-y-2" aria-live="polite" aria-label="Preview">
      {lines.length > 0 && (
        <dl className="rounded-md bg-muted/40 px-3 py-2 text-xs space-y-1">
          {lines.map((spec) => {
            const raw = spec.get(row)
            return (
              <div key={spec.id} className="flex justify-between gap-4">
                <dt className="text-muted-foreground" title={spec.tooltip}>
                  {spec.label}
                </dt>
                <dd className={cn('font-medium text-right', SIGNED.has(spec.id) && typeof raw === 'number' && gainLossColor(raw))}>{fieldText(spec, row)}</dd>
              </div>
            )
          })}
        </dl>
      )}
      {lists.map((spec) => (
        <div
          key={spec.id}
          className={cn(
            'rounded-md px-3 py-2 text-xs',
            spec.id === 'warnings' ? 'flex gap-2 border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30' : 'bg-muted/40',
            spec.id === 'warnings' && TONE_TEXT.warning,
          )}
        >
          {spec.id === 'warnings' && <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />}
          <ul className="space-y-1" aria-label={spec.label}>
            {(spec.get(row) as string[]).map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
