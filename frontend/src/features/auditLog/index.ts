import { USE_MOCK_API } from '@/api/httpClient'
import { auditLogApiMock } from './api.mock'
import { auditLogApiReal } from './api'

export const auditLogApi = USE_MOCK_API ? auditLogApiMock : auditLogApiReal

export * from './types'
export { recordAuditEvent } from './mockStore'
