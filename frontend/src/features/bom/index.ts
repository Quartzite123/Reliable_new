import { USE_MOCK_API } from '@/api/httpClient'
import { bomApiMock } from './api.mock'
import { bomApiReal } from './api'

export const bomApi = USE_MOCK_API ? bomApiMock : bomApiReal

export * from './types'
