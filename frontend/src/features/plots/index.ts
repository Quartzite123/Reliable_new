import { USE_MOCK_API } from '@/api/httpClient'
import { plotsApiMock } from './api.mock'
import { plotsApiReal } from './api'

export const plotsApi = USE_MOCK_API ? plotsApiMock : plotsApiReal

export * from './types'
