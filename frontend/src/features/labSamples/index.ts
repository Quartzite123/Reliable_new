import { USE_MOCK_API } from '@/api/httpClient'
import { labSamplesApiMock } from './api.mock'
import { labSamplesApiReal } from './api'

export const labSamplesApi = USE_MOCK_API ? labSamplesApiMock : labSamplesApiReal

export * from './types'
