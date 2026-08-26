import { USE_MOCK_API } from '@/api/httpClient'
import { seasonsApiMock } from './api.mock'
import { seasonsApiReal } from './api'

export const seasonsApi = USE_MOCK_API ? seasonsApiMock : seasonsApiReal

export * from './types'
