import { localDateInputValue } from '@/lib/format'

/** What every ledger form holds besides its own fields: the inputs of `CommonFields` (the day, and the rate of a US stock). */
export interface CommonValues {
  date: string
  /** CAD per USD, as typed; blank means the Bank of Canada rate of that day. */
  rate: string
}

export const initialCommon = (): CommonValues => ({ date: localDateInputValue(), rate: '' })

/** What every ledger form hook returns: the fields to draw and the request body they make (`null` until valid). */
export interface LedgerForm {
  fields: import('react').ReactNode
  /** Most forms make an `events` body; a dividend decision makes its own request. */
  body: unknown
  /** What the preview is drawn in. */
  currency: import('@/lib/ledger-entry').Currency
}
