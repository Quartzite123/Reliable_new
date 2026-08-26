import { USE_MOCK_API } from '@/api/httpClient'
import { weighingApiMock } from './api.mock'
import { weighingApiReal } from './api'

export const weighingApi = USE_MOCK_API ? weighingApiMock : weighingApiReal

export * from './types'
