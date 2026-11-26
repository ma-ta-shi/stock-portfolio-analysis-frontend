/** A stored or on-demand optimizer run as the tab draws it: its steps with what the run holds about each. */
import type { components } from '@/types/openapi.gen'
import type { PortfolioAccountView } from '@/types'

type Api = components['schemas']
export type Run = Api['RunViewResponse']
export type Order = Api['OrderViewResponse']
export type Waiting = Api['WaitingViewResponse']

/**
 * What to say when a run has no orders (`no_changes` is only that). "Well-positioned" is claimed only when nothing waits and
 * no stock was left out; a run with transfers needs no message, its cards say what to do.
 */
export function noOrdersMessage(run: Run): string | null {
  if (!run.no_changes || run.transfers.length) return null
  const out = run.report?.excluded.map((e) => e.ticker) ?? []
  const parts = [
    run.waiting.length ? 'No orders to place now; what is waiting is listed below.' : null,
    out.length ? `Left out because their analysis cannot be used: ${out.join(', ')}.` : null,
  ].filter(Boolean)
  if (!parts.length) return 'Your portfolio is well-positioned — no changes suggested.'
  return (run.waiting.length ? parts : ['No changes suggested.', ...parts]).join(' ')
}

export interface Step {
  order: Order
  /** Held against target, where the run has it (a benchmark fund buy has none). */
  drift: Api['DriftViewResponse'] | null
  /** The analysis note kept with the run, unless it comes from before the price band. */
  note: Api['ViewNoteResponse'] | null
  whatWouldChange: string[]
}

export interface RunSteps {
  /** Steps the optimizer links (`chain`): money moved from Trading into a registered account. Each group in sequence. */
  linked: Step[][]
  single: Step[]
}

function toStep(order: Order, run: Run): Step {
  // A note from a run before the price band is not shown (owner rule), nor what is built from it: it can quote one user's details.
  const old = order.view?.exclusions.includes('run_predates_band') ?? false
  return {
    order,
    drift: run.drift.find((d) => d.account === order.account && d.ticker === order.ticker) ?? null,
    note: old ? null : order.view,
    whatWouldChange: old ? [] : order.what_would_change,
  }
}

const inView = (view: PortfolioAccountView, ...accounts: (string | null)[]) => view === 'combined' || accounts.includes(view)

export function runSteps(run: Run, view: PortfolioAccountView = 'combined'): RunSteps {
  const all = [...run.orders, ...run.transfers].sort((a, b) => a.sequence - b.sequence).map((o) => toStep(o, run))
  const groups = new Map<string, Step[]>()
  for (const step of all) {
    const { chain } = step.order
    if (chain) groups.set(chain, [...(groups.get(chain) ?? []), step])
  }
  const matches = (s: Step) => inView(view, s.order.account, s.order.to_account)
  return {
    // a linked movement is shown whole when any of its steps is in the chosen account
    linked: [...groups.values()].filter((steps) => steps.some(matches)),
    single: all.filter((s) => !s.order.chain && matches(s)),
  }
}

/** A wait on a limit across the whole portfolio (`account: 'portfolio'`) belongs to every account's view. */
export const waitingIn = (run: Run, view: PortfolioAccountView = 'combined'): Waiting[] =>
  run.waiting.filter((w) => w.account === 'portfolio' || inView(view, w.account))
