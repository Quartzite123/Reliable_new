import { USE_MOCK_API } from '@/api/httpClient'
import { harvestsApiMock } from './api.mock'
import { harvestsApiReal } from './api'

export const harvestsApi = USE_MOCK_API ? harvestsApiMock : harvestsApiReal

export * from './types'
