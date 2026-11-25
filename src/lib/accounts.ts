import type { AccountType } from '@/types/user'

/** The three account types, in the order every screen lists them. */
export const ACCOUNT_TYPES: readonly AccountType[] = ['tfsa', 'rrsp', 'trading']

/** How an account is named in a select or a sentence. */
export const ACCOUNT_LABELS: Record<AccountType, string> = {
  tfsa: 'TFSA',
  rrsp: 'RRSP',
  trading: 'Trading',
}
