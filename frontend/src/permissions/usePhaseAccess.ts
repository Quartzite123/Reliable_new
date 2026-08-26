import { useAuth } from '@/app/AuthContext'
import type { PhaseKey } from '@/types/common'

/**
 * The phase-based counterpart to `usePermission` — the actual access-control
 * check going forward. `user.phases` is optional-chained even though the
 * `User` type marks it required: the real backend's `UserRead` schema has no
 * `phases` field at all (verified via openapi.json), so a user object that
 * came from the real API (not the mock) will have `phases === undefined` at
 * runtime regardless of what the type claims. Without this guard, every
 * phase-gated route/nav check throws when running against the real backend.
 */
export function useHasPhase(phase: PhaseKey): boolean {
  const { user } = useAuth()
  if (!user) return false
  return user.phases?.includes(phase) ?? false
}
