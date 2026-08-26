import { mockDelay } from '@/api/mockDelay'
import type { CompanySettings, UpdateCompanySettingsInput } from './types'

/** Fake but clearly-fake settings so packaging/PO screens have real-looking data without real client details (prompt.md §27). */
const settings: CompanySettings = {
  id: 1,
  companyName: 'Reliable Fresh Exports Pvt. Ltd.',
  companyAddress: 'Gat No. 123, MIDC Road, Pune, Maharashtra, India',
  companyPhone: '+91 90000 00000',
  companyGstNumber: '27AAAAA0000A1Z5',
  companyEmail: 'exports@reliablefresh.test',
  ggnNumber: '4049999999999',
  crateTareWeightKg: '1.60',
  updatedBy: 1,
  updatedAt: new Date().toISOString(),
}

export const companySettingsApiMock = {
  async get(): Promise<CompanySettings> {
    await mockDelay(150)
    return settings
  },

  async update(input: UpdateCompanySettingsInput): Promise<CompanySettings> {
    await mockDelay(400)
    Object.assign(settings, input, { updatedAt: new Date().toISOString() })
    return settings
  },
}
