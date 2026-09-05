import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/app/AuthContext'
import { ROLE_LABELS } from '@/permissions/permissions'
import { BellIcon, LogOutIcon, MenuIcon } from '@/components/icons/Icon'
import { LogoMark } from '@/components/icons/Logo'

interface HeaderProps {
  title?: string
  onMenuClick?: () => void
}

/**
 * Deep-forest bar anchoring the top of every screen.
 *
 * Logout was previously a white pill with red text — the highest-contrast
 * element on the page, which made "sign out" the most visually urgent
 * action on a screen where it is the least important one. It is now a
 * quiet ghost button on the header itself, still a full 44px target.
 */
export function Header({ title, onMenuClick }: HeaderProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="bg-gradient-forest flex min-h-16 items-center justify-between gap-2 px-3 py-2 shadow-card sm:gap-3 sm:px-6">
      <div className="flex min-w-0 items-center gap-2">
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            aria-label="Open menu"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-brand-100 hover:bg-white/10 lg:hidden"
          >
            <MenuIcon className="h-5 w-5" />
          </button>
        )}
        <LogoMark className="h-8 w-8 shrink-0 lg:hidden" />
        <p className="truncate text-base font-semibold text-white">{title ?? 'Reliable Fresh'}</p>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <Link
          to="/notifications"
          aria-label="Notifications"
          className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-brand-100 hover:bg-white/10 hover:text-white"
        >
          <BellIcon className="h-5 w-5" />
        </Link>

        {user && (
          <div className="hidden min-w-0 text-right sm:block">
            <p className="truncate text-sm font-semibold text-white">{user.name}</p>
            <p className="truncate text-xs text-brand-200">{ROLE_LABELS[user.role]}</p>
          </div>
        )}

        <button
          type="button"
          onClick={handleLogout}
          aria-label="Log out"
          className="ml-1 flex min-h-11 items-center gap-1.5 rounded-lg border border-white/20 px-3 text-sm font-medium text-brand-100 hover:border-white/40 hover:bg-white/10 hover:text-white focus-visible:outline-white"
        >
          <LogOutIcon className="h-4 w-4" />
          <span className="hidden sm:inline">Log out</span>
        </button>
      </div>
    </header>
  )
}
