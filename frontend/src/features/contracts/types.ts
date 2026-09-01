import type { EntityId, Timestamped } from '@/types/common'

/**
 * One per season registration, only after Lab passes + bank details exist
 * (Business_Rules R23). ratePerKg/rejectionPercent are decimal strings on
 * read (verified via openapi.json ContractRead) — never do arithmetic on
 * these without `Number(...)` first.
 */
export interface Contract extends Timestamped {
  id: EntityId
  seasonRegistrationId: EntityId
  contractDate?: string
  ratePerKg: string
  /**
   * Always "7.00" — fixed company-wide, no longer editable per contract
   * (Business_Rules R24/R28, rewritten). Kept only because the DB column
   * still exists; not read by weighing/packaging calculations anymore.
   */
  rejectionPercent: string
  terms?: string
  notes?: string
  createdBy: EntityId
}

export interface ContractPrerequisites {
  fieldQcPassed: boolean
  labPassed: boolean
  bankDetailsExist: boolean
  farmerId: EntityId
  farmerName: string
  plotNumber: string
  seasonYear: number
}

/**
 * Matches backend ContractCreate — no `terms`/`notes` field exists there
 * (verified via openapi.json); kept client-side only, never sent.
 * No `rejectionPercent` — it's a fixed 7% applied server-side, not a
 * contract term (Business_Rules R24/R28, rewritten). The backend still
 * defaults `rejection_percent` to 7.00 if omitted from the POST body.
 */
export interface CreateContractInput {
  seasonRegistrationId: EntityId
  contractDate?: string
  ratePerKg: number
  terms?: string
  notes?: string
}

export interface ContractRow {
  contract: Contract
  farmerName: string
  plotNumber: string
  seasonYear: number
}

export interface EligiblePlotForContract {
  seasonRegistrationId: EntityId
  farmerName: string
  plotNumber: string
  seasonYear: number
}
