import { useAuth } from '@/app/AuthContext'
import type { PhaseKey } from '@/types/common'
import { ADMIN_NAV, SUPERVISOR_NAV, type NavItem } from './navConfig'

function filterByPhase(items: NavItem[], phases: PhaseKey[] | undefined): NavItem[] {
  if (!phases) return []
  return items
    .map((item) => (item.children ? { ...item, children: filterByPhase(item.children, phases) } : item))
    .filter((item) => (item.children ? item.children.length > 0 : !item.phaseKey || phases.includes(item.phaseKey)))
}

/** Resolves the full nav list (operational + admin sections) for the current user's assigned phases. */
export function useVisibleNav() {
  const { user } = useAuth()
  return {
    operational: filterByPhase(SUPERVISOR_NAV, user?.phases),
    admin: filterByPhase(ADMIN_NAV, user?.phases),
  }
}
