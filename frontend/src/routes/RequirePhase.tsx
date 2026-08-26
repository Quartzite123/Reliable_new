import { Navigate, Outlet } from 'react-router-dom'
import { useHasPhase } from '@/permissions/usePhaseAccess'
import type { PhaseKey } from '@/types/common'

/** Wraps a route (or route group) that requires a specific phase to view. */
export function RequirePhase({ phase }: { phase: PhaseKey }) {
  const allowed = useHasPhase(phase)

  if (!allowed) {
    return <Navigate to="/home" replace />
  }

  return <Outlet />
}
