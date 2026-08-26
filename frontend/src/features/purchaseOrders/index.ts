import { USE_MOCK_API } from '@/api/httpClient'
import { purchaseOrdersApiMock } from './api.mock'
import { purchaseOrdersApiReal } from './api'

export const purchaseOrdersApi = USE_MOCK_API ? purchaseOrdersApiMock : purchaseOrdersApiReal

export * from './types'
