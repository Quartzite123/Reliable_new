import type { EntityId, Timestamped } from '@/types/common'

export type GoodsReceivingStatus = 'confirmed' | 'pending'

/**
 * Packhouse confirmation step (prompt.md §14). Not a named table in
 * PHASE_MAP.md's data model — implemented per the prompt's explicit field
 * list, kept independent of Weighing's own calculated fields.
 */
export interface GoodsReceivingRecord extends Timestamped {
  id: EntityId
  vehicleTripId: EntityId
  receivedCrates: number
  receivedWeightKg: number
  acceptedWeightKg: number
  rejectedWeightKg: number
  warehouseLocation: string
  notes?: string
  status: GoodsReceivingStatus
  createdBy: string
}

export interface GoodsReceivingInput {
  vehicleTripId: EntityId
  receivedCrates: number
  receivedWeightKg: number
  acceptedWeightKg: number
  rejectedWeightKg: number
  warehouseLocation: string
  notes?: string
}

export interface EligibleTripForGoodsReceiving {
  vehicleTripId: EntityId
  vehicleNo: string
  farmerName: string
  plotNumber: string
  harvestDate: string
}

export interface GoodsReceivingRow {
  record: GoodsReceivingRecord
  vehicleNo: string
  farmerName: string
  plotNumber: string
}
