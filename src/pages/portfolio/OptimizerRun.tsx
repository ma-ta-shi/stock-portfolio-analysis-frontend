/** One optimizer run on screen: its steps (linked ones together), what waits and the warnings. The stored run and the answer share it. */
import { useId, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { FieldList } from '@/components/FieldList'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { fieldText } from '@/lib/fields'
import { BADGE, TONE_TEXT } from '@/lib/labels'
import { noOrdersMessage, runSteps, waitingIn, type Run, type Step } from '@/lib/optimizer'
import { cn } from '@/lib/utils'
import { STEP_FIELDS, WAITING_FIELDS } from '@/screens/optimizer'
import type { PortfolioAccountView } from '@/types'

const field = (id: string) => STEP_FIELDS.find((f) => f.id === id)!
const [TICKER, ACCOUNT, ACTION, SHARES, TARGET, RULE, REBUY, UNUSABLE] = ['ticker', 'account', 'action', 'shares', 'target', 'rule', 'rebuy', 'unusable'].map(field)
const TONE = { buy: BADGE.positive, sell: BADGE.negative, transfer: BADGE.neutral } as const

function StepCard({ step }: { step: Step }) {
  const [open, setOpen] = useState(false)
  const detailsId = useId()
  const { order } = step
  const name = `${fieldText(ACTION, step)} ${fieldText(TICKER, step)}`
  return (
    <article aria-label={name} className="border border-border rounded-lg p-4 space-y-2">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold">{fieldText(TICKER, step)}</span>
          <Badge variant="outline" className="text-xs">{fieldText(ACCOUNT, step)}</Badge>
        </div>
        <Badge className={cn('text-xs', TONE[order.side])}>{fieldText(ACTION, step)}</Badge>
      </div>
      <div className="text-xs text-muted-foreground flex gap-x-4 gap-y-1 flex-wrap">
        {order.shares != null && <span>{fieldText(SHARES, step)}</span>}
        {step.drift && <span>{fieldText(TARGET, step)}</span>}
      </div>
      <div className="text-sm">
        <p className="font-medium">{fieldText(RULE, step)}</p>
        <ul className="text-xs text-muted-foreground list-disc pl-4">
          {order.reasons.map((r, i) => (
            <li key={i}>{r.text}</li>
          ))}
        </ul>
      </div>
      {order.rebuy_not_before && (
        <p className={cn('text-xs font-medium', TONE_TEXT.warning)}>
          {REBUY.label} {fieldText(REBUY, step)}.
        </p>
      )}
      {!!order.view?.exclusions.length && (
        <p className={cn('text-xs', TONE_TEXT.warning)}>
          {UNUSABLE.label}: {fieldText(UNUSABLE, step)}.
        </p>
      )}
      <Button variant="ghost" size="sm" aria-expanded={open} aria-controls={detailsId} aria-label={`${open ? 'Hide' : 'Show'} details of ${name}`} onClick={() => setOpen(!open)}>
        {open ? <ChevronDown className="w-4 h-4" aria-hidden="true" /> : <ChevronRight className="w-4 h-4" aria-hidden="true" />}
        Details
      </Button>
      <div id={detailsId} hidden={!open}>
        {open && <FieldList fields={STEP_FIELDS} row={step} />}
      </div>
    </article>
  )
}

const heading = 'text-sm font-medium text-muted-foreground uppercase tracking-wide'
const stepKey = (s: Step) => s.order.sequence

export function OptimizerRun({ run, view }: { run: Run; view: PortfolioAccountView }) {
  const { linked, single } = runSteps(run, view)
  const waiting = waitingIn(run, view)
  const noOrders = noOrdersMessage(run)
  const warnings = [...run.warnings, ...run.missing.map((m) => `This run did not keep: ${m.replaceAll('_', ' ')}`)]
  return (
    <div className="space-y-6">
      {run.dry_run && (
        <p role="status" className={cn('text-sm', TONE_TEXT.warning)}>
          A dry run with analyses over a week old: a look, not a basis for orders.
        </p>
      )}
      {noOrders && <div className="border border-border rounded-lg p-6 text-center text-muted-foreground text-sm">{noOrders}</div>}
      {!run.no_changes && !linked.length && !single.length && <p className="text-sm text-muted-foreground">Nothing proposed for this account.</p>}
      {linked.length > 0 && (
        <section aria-label="Swap Suggestions" className="space-y-3">
          <h3 className={heading}>Swap Suggestions</h3>
          {linked.map((steps) => (
            <div key={steps[0].order.chain} className="border-l-2 border-border pl-3 space-y-3">
              {steps.map((s) => (
                <StepCard key={stepKey(s)} step={s} />
              ))}
            </div>
          ))}
        </section>
      )}
      {single.length > 0 && (
        <section aria-label="Rebalance Suggestions" className="space-y-3">
          <h3 className={heading}>Rebalance Suggestions</h3>
          {single.map((s) => (
            <StepCard key={stepKey(s)} step={s} />
          ))}
        </section>
      )}
      {waiting.length > 0 && (
        <section aria-label="Waiting" className="space-y-3">
          <h3 className={heading}>Waiting</h3>
          <ul className="space-y-2">
            {waiting.map((w, i) => (
              <li key={i} className="border border-border rounded-lg p-3">
                <FieldList fields={WAITING_FIELDS} row={w} place="column" className="grid gap-2 sm:grid-cols-3 text-sm" />
              </li>
            ))}
          </ul>
        </section>
      )}
      {warnings.length > 0 && (
        <section aria-label="Warnings" className="space-y-2">
          <h3 className={heading}>Warnings</h3>
          <ul className="list-disc pl-5 text-sm">
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
