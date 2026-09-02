import type { EntityId, Timestamped } from '@/types/common'

export type FarmerStatus = 'active' | 'inactive'

export interface PlotSummary {
  id: EntityId
  plotNumber: string
  /** All varieties this plot carries — a plot can have more than one (plot_varieties). Not currently rendered anywhere in this feature (see features/plots' own PlotSummary, used instead by FarmerDetailPage). */
  varietyNames: string[]
  areaAcres: string | null
  village: string | null
}

/** Permanent farmer master record (Business_Rules R1) — never deleted, only deactivated. */
export interface Farmer extends Timestamped {
  id: EntityId
  name: string
  address: string
  mobile: string
  status: FarmerStatus
  /** Present on the real FarmerRead payload but not modeled deeply here — the app fetches bank details separately via useBankDetails. */
  bankDetails?: BankDetails | null
  plots?: PlotSummary[]
}

/**
 * Matches backend FarmerSearchResult exactly (verified via openapi.json) —
 * no `matchScore` field; the backend doesn't return one. It's also a
 * narrower shape than Farmer (no timestamps), so this does NOT extend Farmer.
 */
export interface FarmerSearchResult {
  id: EntityId
  name: string
  mobile: string
  address: string
  status: FarmerStatus
  plots?: PlotSummary[]
}

export interface CreateFarmerInput {
  name: string
  address: string
  mobile: string
}

export interface UpdateFarmerInput extends CreateFarmerInput {
  status: FarmerStatus
}

/** 1:1 with farmer (Business_Rules Phase 1B) — optional at farmer creation, required before Contract. */
export interface BankDetails extends Timestamped {
  id: EntityId
  farmerId: EntityId
  accountHolderName: string
  bankName: string
  accountNumber: string
  ifscCode: string
  branchName?: string
  passbookPhotoUrl?: string
}

export interface SaveBankDetailsInput {
  accountHolderName: string
  bankName: string
  accountNumber: string
  ifscCode: string
  branchName?: string
  passbookPhoto?: File | null
}
