import { USE_MOCK_API } from '@/api/httpClient'
import { palletisationApiMock } from './api.mock'
import { palletisationApiReal } from './api'

export const palletisationApi = USE_MOCK_API ? palletisationApiMock : palletisationApiReal

export * from './types'
