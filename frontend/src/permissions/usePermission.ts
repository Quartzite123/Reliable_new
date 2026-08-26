import { useAuth } from '@/app/AuthContext'
import { roleHasPermission, type PermissionKey } from './permissions'

/** The single way any component should check access — never `user.role === 'x'`. */
export function usePermission(key: PermissionKey): boolean {
  const { user } = useAuth()
  if (!user) return false
  return roleHasPermission(user.role, key)
}

export function useHasAnyPermission(keys: PermissionKey[]): boolean {
  const { user } = useAuth()
  if (!user) return false
  return keys.some((key) => roleHasPermission(user.role, key))
}
