import { USE_MOCK_API } from '@/api/httpClient'
import { customersApiMock } from './api.mock'
import { customersApiReal } from './api'

export const customersApi = USE_MOCK_API ? customersApiMock : customersApiReal

export * from './types'
