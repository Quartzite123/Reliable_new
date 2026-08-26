import { useQuery } from '@tanstack/react-query'
import { auditLogApi } from './index'
import type { AuditLogFilters } from './types'

export function useAuditLog(filters: AuditLogFilters) {
  return useQuery({ queryKey: ['audit-log', filters], queryFn: () => auditLogApi.list(filters) })
}
