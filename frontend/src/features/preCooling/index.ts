import { USE_MOCK_API } from '@/api/httpClient'
import { preCoolingApiMock } from './api.mock'
import { preCoolingApiReal } from './api'

export const preCoolingApi = USE_MOCK_API ? preCoolingApiMock : preCoolingApiReal

export * from './types'
