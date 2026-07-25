import { createContext, useContext, useState } from 'react'

interface UserContextValue {
  userId: string
  setUserId: (id: string) => void
}

const STORAGE_KEY = 'stock-picker-user-id'
const DEFAULT_USER = 'user_01'

const UserContext = createContext<UserContextValue | null>(null)

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserIdState] = useState<string>(
    () => localStorage.getItem(STORAGE_KEY) ?? DEFAULT_USER,
  )

  function setUserId(id: string) {
    localStorage.setItem(STORAGE_KEY, id)
    setUserIdState(id)
  }

  return (
    <UserContext.Provider value={{ userId, setUserId }}>
      {children}
    </UserContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useUser(): UserContextValue {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useUser must be used inside UserProvider')
  return ctx
}
