import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { safeStorage } from '@/lib/storage'

interface UserContextValue {
  userId: string
  setUserId: (id: string) => void
}

const STORAGE_KEY = 'stock-picker-user-id'
const DEFAULT_USER = 'user_01'

const UserContext = createContext<UserContextValue | null>(null)

export function UserProvider({ children }: { children: ReactNode }) {
  const [userId, setUserIdState] = useState<string>(
    () => safeStorage.local.get(STORAGE_KEY) ?? DEFAULT_USER,
  )

  const setUserId = useCallback((id: string) => {
    safeStorage.local.set(STORAGE_KEY, id)
    setUserIdState(id)
  }, [])

  const value = useMemo(() => ({ userId, setUserId }), [userId, setUserId])

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useUser(): UserContextValue {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useUser must be used inside UserProvider')
  return ctx
}
