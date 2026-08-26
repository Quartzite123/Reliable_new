import { USE_MOCK_API } from '@/api/httpClient'
import { authApiMock } from './api.mock'
import { authApiReal } from './api.ts'

/**
 * Single switch point for auth. Every other module (context, hooks, pages)
 * imports `authApi` from here and is unaware whether it's mock or real.
 */
export const authApi = USE_MOCK_API ? authApiMock : authApiReal

export * from './types'
