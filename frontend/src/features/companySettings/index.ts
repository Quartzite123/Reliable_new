import { USE_MOCK_API } from '@/api/httpClient'
import { companySettingsApiMock } from './api.mock'
import { companySettingsApiReal } from './api'

export const companySettingsApi = USE_MOCK_API ? companySettingsApiMock : companySettingsApiReal

export * from './types'
