import { useRowActions, type RowActions } from '@/hooks/use-row-actions'
import type { Holding } from '@/types/portfolio'

/** The things the owner can do to a holding from a table row or a position card. */
export type HoldingAction = 'buy' | 'sell' | 'edit' | 'dividend' | 'remove'

export type HoldingActions = RowActions<Holding, HoldingAction>

/** The Holdings table and the Stock page both act on holdings: each calls this once and renders `<HoldingActionDialogs actions={...} />`. */
export function useHoldingActions(): HoldingActions {
  return useRowActions<Holding, HoldingAction>()
}
