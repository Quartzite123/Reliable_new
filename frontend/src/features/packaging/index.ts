import { USE_MOCK_API } from '@/api/httpClient'
import { packagingApiMock } from './api.mock'
import { packagingApiReal } from './api'

export const packagingApi = USE_MOCK_API ? packagingApiMock : packagingApiReal

export * from './types'
export * from './comboSeed'
