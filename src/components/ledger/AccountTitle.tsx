import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import type { AccountType } from '@/types/user'

/** The title of a dialog about one account's entry or position: the words, then the account as a badge ("from " for a move). */
export function AccountTitle({ children, account, prefix = '' }: { children: ReactNode; account: AccountType; prefix?: string }) {
  return (
    <>
      {children}
      <Badge variant="outline" className="ml-2 text-xs font-normal">
        {prefix}
        {account.toUpperCase()}
      </Badge>
    </>
  )
}
