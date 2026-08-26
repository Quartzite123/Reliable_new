import { USE_MOCK_API } from '@/api/httpClient'
import { arrivalQcApiMock } from './api.mock'
import { arrivalQcApiReal } from './api'

export const arrivalQcApi = USE_MOCK_API ? arrivalQcApiMock : arrivalQcApiReal

export * from './types'
