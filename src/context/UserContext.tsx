import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { PageLoading } from '@/components/PageLoading'
import { QueryError } from '@/components/QueryError'
import { usePortfolioOwners } from '@/hooks/use-portfolio-owners'
import { useUsers } from '@/hooks/use-users'
import { pickUserId } from '@/lib/default-user'
import { safeStorage } from '@/lib/storage'

interface UserContextValue {
  userId: string
  setUserId: (id: string) => void
}

const STORAGE_KEY = 'stock-picker-user-id'

const UserContext = createContext<UserContextValue | null>(null)

/**
 * Resolves the active user from the backend before any page renders, so `useUser()` always returns a real id
 * (rule in `lib/default-user.ts`). A failed owners lookup is ignored; a failed users lookup shows a retry.
 */
export function UserProvider({ children }: { children: ReactNode }) {
  const { data: users, isLoading, isError, error, refetch } = useUsers()
  const { data: owners, isLoading: ownersLoading } = usePortfolioOwners()
  const [selected, setSelected] = useState<string | null>(() => safeStorage.local.get(STORAGE_KEY))

  const setUserId = useCallback((id: string) => {
    safeStorage.local.set(STORAGE_KEY, id)
    setSelected(id)
  }, [])

  const userId = users ? pickUserId(users, selected, owners ?? null) : null

  const value = useMemo(() => (userId ? { userId, setUserId } : null), [userId, setUserId])

  if (isLoading || ownersLoading) return <PageLoading />
  if (isError) {
    return <QueryError what="profiles" error={error} onRetry={refetch} className="max-w-screen-xl mx-auto mt-6" />
  }
  if (!value) {
    // First run: no profile exists yet. Creating one is the first-run flow of the Settings ticket (86bd5z6n3), which
    // must let the router render without a user.
    return (
      <p role="status" className="max-w-screen-xl mx-auto px-4 py-6 text-sm text-muted-foreground">
        No profile exists yet.
      </p>
    )
  }

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useUser(): UserContextValue {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useUser must be used inside UserProvider')
  return ctx
}
