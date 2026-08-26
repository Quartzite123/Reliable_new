import type { Role } from '@/types/common'

export interface AuditEvent {
  id: string
  timestamp: string
  userId: string | null
  userName: string
  role: string
  action: string
  module: string
  recordRef?: string
  result: 'success' | 'fail'
  oldStatus?: string
  newStatus?: string
}

export interface AuditActor {
  id: string | null
  name: string
  roles: Role[]
}

export interface RecordAuditEventInput {
  action: string
  module: string
  recordRef?: string
  result: 'success' | 'fail'
  oldStatus?: string
  newStatus?: string
  /** Only needed where no logged-in actor exists yet, e.g. a failed login attempt. */
  actorOverride?: AuditActor
}

export interface AuditLogFilters {
  userId?: string
  role?: string
  module?: string
  action?: string
  result?: 'success' | 'fail'
  dateFrom?: string
  dateTo?: string
}
