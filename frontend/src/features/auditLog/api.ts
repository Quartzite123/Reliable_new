import { httpClient } from '@/api/httpClient'
import type { AuditEvent, AuditLogFilters } from './types'

function toQueryString(filters: AuditLogFilters) {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value)
  })
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export const auditLogApiReal = {
  list: (filters: AuditLogFilters = {}) => httpClient.get<AuditEvent[]>(`/audit-log${toQueryString(filters)}`),
}
