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

        <nav aria-label="Main" className="flex items-center gap-4">
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
          {/* Alerts are listed under "What Changed" on Home; the bell links there. */}
          <Link
            to="/"
            className="relative rounded-md p-1 hover:bg-muted transition-colors"
            aria-label={unreadCount ? `Alerts, ${unreadCount} unread` : 'Alerts'}
          >
            <Bell className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
            {!!unreadCount && unreadCount > 0 && (
              <span
                aria-hidden="true"
                className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-blue-500 text-white text-[9px] flex items-center justify-center leading-none"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
          <ProfileSwitcher />
        </div>
      </div>
    </header>
  )
}
