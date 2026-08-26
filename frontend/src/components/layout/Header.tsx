import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/app/AuthContext'
import { ROLE_LABELS } from '@/permissions/permissions'
import { BellIcon, LogOutIcon, MenuIcon } from '@/components/icons/Icon'
import { LogoMark } from '@/components/icons/Logo'

interface HeaderProps {
  title?: string
  onMenuClick?: () => void
}

/** Deep-forest gradient anchor — the top of the app's color journey (dark forest -> lime -> mint -> cream, elsewhere). */
export function Header({ title, onMenuClick }: HeaderProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="bg-gradient-forest flex min-h-16 items-center justify-between gap-3 px-4 py-2 shadow-card sm:px-6">
      <div className="flex min-w-0 items-center gap-2">
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            aria-label="Open menu"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-brand-100 hover:bg-white/10 lg:hidden"
          >
            <MenuIcon className="h-5 w-5" />
          </button>
        )}
        <LogoMark className="h-8 w-8 shrink-0 lg:hidden" />
        <p className="truncate text-base font-semibold text-white">{title ?? 'Reliable Fresh'}</p>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <Link
          to="/notifications"
          aria-label="Notifications"
          className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-brand-100 hover:bg-white/10 hover:text-white"
        >
          <BellIcon className="h-5 w-5" />
        </Link>

        {user && (
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-white">{user.name}</p>
            <p className="text-xs text-brand-200">{ROLE_LABELS[user.role]}</p>
          </div>
        )}

        <button
          type="button"
          onClick={handleLogout}
          className="flex min-h-11 items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3.5 text-sm font-medium text-red-600 transition-all duration-200 ease-out hover:border-red-300 hover:bg-red-50 hover:text-red-700 active:scale-[0.98] focus-visible:outline-red-500"
        >
          <LogOutIcon className="h-4 w-4" />
          Logout
        </button>
      </div>
    </header>
  )
}
