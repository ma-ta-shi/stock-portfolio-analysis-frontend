import { useState } from 'react'

export interface RowActions<Row, Action extends string> {
  /** The dialog that is open, and the row it is for; one at a time. */
  current: { action: Action; row: Row } | null
  open: (action: Action, row: Row) => void
  close: () => void
}

/**
 * Which action is open for which row. Every table of rows the owner acts on (holdings, ledger entries, waiting dividends) keeps this
 * one piece of state and renders one switch component that mounts the dialog of the open action; before this each page kept its own
 * state for every dialog.
 */
export function useRowActions<Row, Action extends string>(): RowActions<Row, Action> {
  const [current, setCurrent] = useState<RowActions<Row, Action>['current']>(null)
  return { current, open: (action, row) => setCurrent({ action, row }), close: () => setCurrent(null) }
}
