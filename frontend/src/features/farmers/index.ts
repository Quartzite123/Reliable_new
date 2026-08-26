import { USE_MOCK_API } from '@/api/httpClient'
import { farmersApiMock } from './api.mock'
import { farmersApiReal } from './api'

export const farmersApi = USE_MOCK_API ? farmersApiMock : farmersApiReal

export * from './types'
