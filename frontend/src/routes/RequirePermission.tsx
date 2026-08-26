import { Navigate, Outlet } from 'react-router-dom'
import { usePermission } from '@/permissions/usePermission'
import type { PermissionKey } from '@/permissions/permissions'

/** Wraps a route (or route group) that requires a specific permission key to view. */
export function RequirePermission({ permission }: { permission: PermissionKey }) {
  const allowed = usePermission(permission)

  if (!allowed) {
    return <Navigate to="/home" replace />
  }

  return <Outlet />
}
