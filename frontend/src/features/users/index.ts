import { USE_MOCK_API } from '@/api/httpClient'
import { usersApiMock } from './api.mock'
import { usersApiReal } from './api'

export const usersApi = USE_MOCK_API ? usersApiMock : usersApiReal

export * from './types'
