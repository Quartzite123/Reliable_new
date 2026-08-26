import { USE_MOCK_API } from '@/api/httpClient'
import { contractsApiMock } from './api.mock'
import { contractsApiReal } from './api'

export const contractsApi = USE_MOCK_API ? contractsApiMock : contractsApiReal

export * from './types'
