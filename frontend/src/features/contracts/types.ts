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
  /** Defaults to 7 but is editable per contract — Business_Rules R24. Never hardcode 7 downstream. */
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

/** Matches backend ContractCreate — no `terms`/`notes` field exists there (verified via openapi.json); kept client-side only, never sent. */
export interface CreateContractInput {
  seasonRegistrationId: EntityId
  contractDate?: string
  ratePerKg: number
  rejectionPercent?: number
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
