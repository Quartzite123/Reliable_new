import type { EntityId } from '@/types/common'

/**
 * Single-row Admin-managed config (PHASE_MAP.md §7). Feeds the GGN number and
 * letterhead everywhere they're needed — never hardcode these in a screen
 * (CLAUDE.md §12). All fields nullable on the real backend.
 */
export interface CompanySettings {
  id: EntityId
  companyName?: string
  companyAddress?: string
  companyPhone?: string
  companyGstNumber?: string
  companyEmail?: string
  ggnNumber?: string
  /** Weighing slip #937 addendum — tare weight per empty crate (decimal-as-string, e.g. "1.60"). Falls back to 1.6 kg when absent. */
  crateTareWeightKg?: string
  updatedBy?: EntityId
  updatedAt: string
}

export type UpdateCompanySettingsInput = Partial<Omit<CompanySettings, 'id' | 'updatedBy' | 'updatedAt'>>
