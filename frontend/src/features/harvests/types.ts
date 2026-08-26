import type { EntityId, Timestamped } from '@/types/common'
import type { GrapeVariety } from '@/features/plots'

/**
 * Multiple harvest rounds per season registration are allowed (Business_Rules R26).
 * `approxWeightKg`/decimal-shaped fields on the vehicle trips are strings on Read
 * (backend Decimal fields serialize as JSON strings — CLAUDE.md §9).
 */
export interface Harvest extends Timestamped {
  id: EntityId
  seasonRegistrationId: EntityId
  harvestDate: string
  supervisorName?: string
  supervisorContact?: string
  createdBy: EntityId
  vehicleTrips: VehicleTrip[]
}

/** Multiple vehicle trips per harvest (prompt.md §13). */
export interface VehicleTrip {
  id: EntityId
  harvestId: EntityId
  vehicleNo?: string
  driverName?: string
  numCrates?: number
  /** Field estimate — actual weight is captured in Weighing. Decimal-as-string on Read. */
  approxWeightKg?: string
  isWeighed: boolean

  // Phase 6 weighing-time actuals (weighing slip #937 addendum) — filled once
  // the trip is weighed, never overwriting the harvest-time estimates above.
  crateCountAtWeighing?: number
  grossWeightKg?: string
  tareWeightKg?: string
  netFruitWeightKg?: string
}

export interface VehicleTripInput {
  vehicleNo: string
  driverName: string
  numCrates: number
  approxWeightKg: number
}

export interface CreateHarvestInput {
  seasonRegistrationId: EntityId
  harvestDate: string
  supervisorName?: string
  supervisorContact?: string
  trips: VehicleTripInput[]
}

export interface EligiblePlotForHarvest {
  seasonRegistrationId: EntityId
  farmerName: string
  plotNumber: string
  seasonYear: number
  variety: GrapeVariety
}

export interface HarvestRow {
  harvest: Harvest
  farmerName: string
  plotNumber: string
  seasonYear: number
  tripCount: number
}

export interface HarvestDetail {
  harvest: Harvest
  farmerName: string
  plotNumber: string
  seasonYear: number
  seasonRegistrationId: EntityId
  trips: VehicleTrip[]
}

export interface VehicleTripRow {
  trip: VehicleTrip
  harvestDate: string
  farmerName: string
  plotNumber: string
  weighed: boolean
}
