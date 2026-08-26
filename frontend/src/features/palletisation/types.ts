import type { EntityId, Timestamped } from '@/types/common'

export type PalletType = 'Big' | 'Mini'
export const PALLET_TYPES: PalletType[] = ['Big', 'Mini']

export type PalletStatus = 'created' | 'pre_cooling' | 'dispatched'

/** Junction row — a pallet may hold boxes from multiple lots (Business_Rules R35). */
export interface PalletisationLot {
  id: EntityId
  packagingRecordId: EntityId
  numBoxes: number
  lotId?: string
}

/** PHASE_MAP.md §7 — `pallet_id` format is unresolved (Open_Questions.md #10); treat it as a display-only, backend-generated value. */
export interface Pallet extends Timestamped {
  id: EntityId
  palletId: string
  date?: string
  palletType: PalletType
  totalBoxes?: number
  notes?: string
  status: PalletStatus
  createdBy: EntityId
  lots: PalletisationLot[]
}

export interface CreatePalletInput {
  date: string
  palletType: PalletType
  notes?: string
  lots: Array<{ packagingRecordId: EntityId; numBoxes: number }>
}

export interface AvailableLot {
  packagingRecordId: EntityId
  lotId: string
  farmerName: string
  customerName: string
  packSize: string
  totalBoxes: number
  /** Boxes from this lot not yet assigned to any pallet. */
  remainingBoxes: number
}

export interface PalletRow {
  pallet: Pallet
  lotCount: number
}

export interface PalletDetail {
  pallet: Pallet
  lots: Array<{ lot: PalletisationLot; lotId: string; farmerName: string; customerName: string }>
}
