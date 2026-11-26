import { Outlet } from 'react-router-dom'
import { useUser } from '@/context/UserContext'
import { Header } from './Header'

export function AppLayout() {
  const { userId } = useUser()
  return (
    <div className="min-h-screen bg-background">
      <Header />
      {/* The key remounts the page when the user changes, so nothing one user had on screen (kept rows, typed forms) shows for
          another. The header is outside it: the profile switcher keeps keyboard focus. */}
      <main key={userId} className="max-w-screen-xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
