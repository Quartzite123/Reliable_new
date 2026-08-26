import type { EntityId, Timestamped } from '@/types/common'

/**
 * The real backend creates one row per pallet (`PreCoolingRead.pallet_id` is
 * singular, not an array) — `POST /pre-cooling` accepts `pallet_ids: number[]`
 * but returns one record per pallet (verified via openapi.json). The old
 * "one record covers a batch of pallets" model is replaced accordingly;
 * `PreCoolingRow`/pages group same-batch records by shared date+in-time for
 * display, since there's no batch id linking them.
 */
export interface PreCoolingRecord extends Timestamped {
  id: EntityId
  palletId: EntityId
  date?: string
  numPallets?: number
  numBoxes?: number
  inTime?: string
  inBerryTemp?: string
  outTime?: string
  outBerryTemp?: string
  createdBy: EntityId
  isComplete: boolean
}

export interface CreatePreCoolingInput {
  date: string
  inTime: string
  inBerryTemp: number
  numBoxes?: number
  palletIds: EntityId[]
}

export interface CompletePreCoolingInput {
  outTime: string
  outBerryTemp: number
}

export interface EligiblePalletForPreCooling {
  palletId: EntityId
  palletLabel: string
  palletType: string
  totalBoxes: number
}

export interface PreCoolingRow {
  record: PreCoolingRecord
  palletLabel: string
  isComplete: boolean
}
