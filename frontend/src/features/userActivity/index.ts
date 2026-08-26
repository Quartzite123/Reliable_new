import { USE_MOCK_API } from '@/api/httpClient'
import { userActivityApiMock } from './api.mock'
import { userActivityApiReal } from './api'

export const userActivityApi = USE_MOCK_API ? userActivityApiMock : userActivityApiReal

export * from './types'
export { recordLoginFailure, recordLoginSuccess, recordLogout } from './mockStore'
