import { httpClient } from '@/api/httpClient'
import type { CompanySettings, UpdateCompanySettingsInput } from './types'

export const companySettingsApiReal = {
  get: () => httpClient.get<CompanySettings>('/company-settings'),
  update: (input: UpdateCompanySettingsInput) => httpClient.put<CompanySettings>('/company-settings', input),
}
