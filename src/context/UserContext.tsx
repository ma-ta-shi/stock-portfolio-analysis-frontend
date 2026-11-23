import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { PageLoading } from '@/components/PageLoading'
import { QueryError } from '@/components/QueryError'
import { useUsers } from '@/hooks/use-users'
import { safeStorage } from '@/lib/storage'

interface UserContextValue {
  userId: string
  setUserId: (id: string) => void
}

const STORAGE_KEY = 'stock-picker-user-id'

const UserContext = createContext<UserContextValue | null>(null)

/**
 * Resolves the active user from the backend before any page renders, so `useUser()` always returns a real id:
 * the stored user if that user still exists (an archived or unknown one is ignored), otherwise the first user.
 */
export function UserProvider({ children }: { children: ReactNode }) {
  const { data: users, isLoading, isError, error, refetch } = useUsers()
  const [selected, setSelected] = useState<string | null>(() => safeStorage.local.get(STORAGE_KEY))

  const setUserId = useCallback((id: string) => {
    safeStorage.local.set(STORAGE_KEY, id)
    setSelected(id)
  }, [])

  const userId = users?.some((u) => u.user_id === selected) ? selected : (users?.[0]?.user_id ?? null)

  const value = useMemo(() => (userId ? { userId, setUserId } : null), [userId, setUserId])

  if (isLoading) return <PageLoading />
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
