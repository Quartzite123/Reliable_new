import { mockDelay } from '@/api/mockDelay'
import { auditEventsStore } from './mockStore'
import type { AuditEvent, AuditLogFilters } from './types'

export const auditLogApiMock = {
  async list(filters: AuditLogFilters = {}): Promise<AuditEvent[]> {
    await mockDelay()
    return auditEventsStore.filter((event) => {
      if (filters.userId && event.userId !== filters.userId) return false
      if (filters.role && event.role !== filters.role) return false
      if (filters.module && event.module !== filters.module) return false
      if (filters.action && event.action !== filters.action) return false
      if (filters.result && event.result !== filters.result) return false
      if (filters.dateFrom && event.timestamp.slice(0, 10) < filters.dateFrom) return false
      if (filters.dateTo && event.timestamp.slice(0, 10) > filters.dateTo) return false
      return true
    })
  },
}
