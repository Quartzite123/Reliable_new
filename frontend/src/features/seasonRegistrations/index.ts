import { USE_MOCK_API } from '@/api/httpClient'
import { seasonRegistrationsApiMock } from './api.mock'
import { seasonRegistrationsApiReal } from './api'

export const seasonRegistrationsApi = USE_MOCK_API ? seasonRegistrationsApiMock : seasonRegistrationsApiReal

export * from './types'
