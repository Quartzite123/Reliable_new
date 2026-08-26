import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/app/AuthContext'

/**
 * Frontend route guard. This is UX convenience only — the backend remains
 * authoritative for every gate (CLAUDE.md §4.7, prompt.md §4/§27).
 *
 * Deliberately does not carry a "redirect back to this page" state: the
 * same device may be handed off between different workers' logins, and
 * honoring a leftover redirect target could drop the next person who signs
 * in onto whatever page the previous session was viewing (see LoginPage).
 */
export function ProtectedRoute() {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
