/**
 * The gap registry: every place the frontend cannot show or do something the owner expects, with why and which ticket
 * closes it. One list (`gaps.json`); the register document `docs/gap-register.md` is generated from it
 * (`npm run gen:gaps`), and `notConnected(id)` in `lib/api.ts` builds the visible error from it, so a control, a label and
 * the document always agree. Ids start with the screen: `P-` portfolio, `W-` watchlist, `S-` stock and analysis, `O-` optimizer,
 * `T-` settings, `F-` feedback, `H-` home, `E-` end-to-end.
 */
import gaps from './gaps.json'

export type GapId = keyof typeof gaps

export interface Gap {
  screen: string
  /** `not-connected`: a control that errors until its ticket; `missing`: data or behaviour absent; `documented`: a deliberate difference. */
  kind: 'not-connected' | 'missing' | 'documented'
  what: string
  why: string
  /** ClickUp ticket that closes it. */
  ticket: string
}

export const GAPS: Record<GapId, Gap> = gaps as Record<GapId, Gap>

export function isGapId(id: string): id is GapId {
  return id in GAPS
}

/** "Recording a sale is not connected yet (P-W2, ticket 86bd5z6mq)." */
export function notConnectedMessage(id: GapId): string {
  const gap = GAPS[id]
  return `${gap.what} is not connected yet (${id}, ticket ${gap.ticket}).`
}

/** "unavailable (P-C2)": the label for a figure the API does not serve. */
export function unavailableLabel(id: GapId): string {
  return `unavailable (${id})`
}
