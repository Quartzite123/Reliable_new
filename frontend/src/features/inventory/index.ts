import { USE_MOCK_API } from '@/api/httpClient'
import { inventoryApiMock } from './api.mock'
import { inventoryApiReal } from './api'

export const inventoryApi = USE_MOCK_API ? inventoryApiMock : inventoryApiReal

export * from './types'
export * from './stockStatus'
