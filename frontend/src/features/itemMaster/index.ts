import { USE_MOCK_API } from '@/api/httpClient'
import { itemMasterApiMock } from './api.mock'
import { itemMasterApiReal } from './api'

export const itemMasterApi = USE_MOCK_API ? itemMasterApiMock : itemMasterApiReal

export * from './types'
