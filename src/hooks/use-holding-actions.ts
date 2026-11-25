import { useState } from 'react'
import type { Holding } from '@/types/portfolio'

/** The things the owner can do to a holding from a table row or a position card. */
export type HoldingAction = 'buy' | 'sell' | 'edit' | 'dividend' | 'remove'

export interface HoldingActions {
  /** The dialog that is open, and the holding it is for; one at a time. */
  current: { action: HoldingAction; holding: Holding } | null
  open: (action: HoldingAction, holding: Holding) => void
  close: () => void
}

/**
 * Which holding action is open. The Holdings table and the Stock page both act on holdings; before this each kept its own state for
 * every dialog and rendered the same dialog elements. They now call this once and render `<HoldingActionDialogs actions={...} />`.
 */
export function useHoldingActions(): HoldingActions {
  const [current, setCurrent] = useState<HoldingActions['current']>(null)
  return { current, open: (action, holding) => setCurrent({ action, holding }), close: () => setCurrent(null) }
}
