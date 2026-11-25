import { localDateInputValue } from '@/lib/format'
import type { ReasonCode } from '@/lib/ledger-entry'

/** What every ledger form holds besides its own fields: the inputs of `CommonFields`. */
export interface CommonValues {
  date: string
  /** CAD per USD, as typed; blank means the Bank of Canada rate of that day. */
  rate: string
  reason: ReasonCode | ''
  notes: string
}

export const initialCommon = (): CommonValues => ({ date: localDateInputValue(), rate: '', reason: '', notes: '' })
