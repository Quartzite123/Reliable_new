import type { EntityId, Role } from '@/types/common'

export interface UserActivityRow {
  userId: EntityId
  name: string
  email: string
  roles: Role[]
  active: boolean
  lastLoginAt: string | null
  lastLogoutAt: string | null
  lastActivityAt: string | null
  failedLoginCount: number
  lastFailedLoginAt: string | null
}
