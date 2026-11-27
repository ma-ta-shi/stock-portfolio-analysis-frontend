import { NavLink, Link } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { ProfileSwitcher } from './ProfileSwitcher'

export function Header() {
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
          <NavLink to="/portfolio" className={navLinkClass}>
            Portfolio
          </NavLink>
          <NavLink to="/watchlist" className={navLinkClass}>
            Watchlist
          </NavLink>
          <NavLink to="/feedback" className={navLinkClass}>
            Feedback
          </NavLink>
          <NavLink to="/settings" className={navLinkClass}>
            Settings
          </NavLink>
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {/* no count: nothing stores what has been read (gap H-3) */}
          <div role="img" className="p-1" aria-label="Notifications are not counted yet">
            <Bell className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
          </div>
          <ProfileSwitcher />
        </div>
      </div>
    </header>
  )
}
