import { NavLink, Link } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { useUnreadCount } from '@/hooks/use-alerts'
import { ProfileSwitcher } from './ProfileSwitcher'

export function Header() {
  const { data: unreadCount } = useUnreadCount()

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? 'text-primary font-medium text-sm'
      : 'text-muted-foreground text-sm hover:text-foreground transition-colors'

  return (
    <header className="border-b border-border bg-background sticky top-0 z-10">
      <div className="max-w-screen-xl mx-auto px-4 h-14 flex items-center gap-6">
        <Link to="/" className="font-semibold text-foreground tracking-tight">
          StockPicker
        </Link>

        <nav className="flex items-center gap-4">
          <NavLink to="/" end className={navLinkClass}>
            Home
          </NavLink>
          <NavLink to="/watchlist" className={navLinkClass}>
            Watchlist
          </NavLink>
          <NavLink to="/portfolio" className={navLinkClass}>
            Portfolio
          </NavLink>
          <NavLink to="/feedback" className={navLinkClass}>
            Feedback
          </NavLink>
          <NavLink to="/settings" className={navLinkClass}>
            Settings
          </NavLink>
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <div className="relative">
            <Bell className="w-4 h-4 text-muted-foreground" />
            {!!unreadCount && unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-blue-500 text-white text-[9px] flex items-center justify-center leading-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <ProfileSwitcher />
        </div>
      </div>
    </header>
  )
}
