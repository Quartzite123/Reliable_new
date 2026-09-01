import type { EntityId, Timestamped } from '@/types/common'

/**
 * One WeighingRecord per vehicle trip (Business_Rules R27, PHASE_MAP.md §7,
 * weighing slip #937 addendum — see backend app/models/weighing.py
 * docstring for why harvest-level was considered and rejected). All
 * decimal fields are strings on Read, matching every other feature in this
 * app (verified via openapi.json — Pydantic Decimal serializes as a JSON
 * string, e.g. ContractRead.rejection_percent) — never do arithmetic on
 * these without `Number(...)` first, and never recompute rejection/net
 * client-side; the server is authoritative.
 */
export interface WeighingRecord extends Timestamped {
  id: EntityId
  vehicleTripId: EntityId
  date?: string
  slipNo?: string
  supervisorName?: string
  numCrates?: number
  totalWeightKg: string // "Gross Weight" on the physical slip — post-tare, pre-rejection net fruit weight for this trip
  rejectionPct?: string // the fixed rate actually charged (always 7 — founder-confirmed, not read from the contract)
  actualRejectionPct?: string // operator-observed rejection — recorded for reference only, never charged
  rejectionKg?: string // calculated server-side from the fixed rate only
  netWeightKg?: string // payable: totalWeightKg − rejectionKg
  slipPhotoUrl?: string

  // Slip #937 identifying/detail fields.
  slipSerialNo?: string
  loadId?: string
  harvesterNo?: string
  noCrtReci?: string
  knitting?: string
  produceType?: string // 'Grapes' | 'Pomo'
  averageSize?: string
  averageSugar?: string // TSS °Brix
  villageName?: string
  contactNo?: string
  crateTareWeightKg?: string // tare rate applied to this record (e.g. "1.60")

  // Per-trip weighing actuals — live on vehicle_trips, returned here for display/print.
  crateCountAtWeighing?: number
  grossWeightKg?: string // raw scale reading
  tareWeightKg?: string // calculated: crateCountAtWeighing × tare rate
  netFruitWeightKg?: string // calculated: grossWeightKg − tareWeightKg (same value as totalWeightKg)

  crateMismatch: boolean
  crateMismatchMessage?: string
  createdBy: EntityId
}

export interface CreateWeighingInput {
  vehicleTripId: EntityId
  date: string
  slipSerialNo?: string
  slipNo?: string
  loadId?: string
  harvesterNo?: string
  noCrtReci?: string
  knitting?: string
  produceType?: string
  averageSize?: string
  averageSugar?: number
  villageName?: string
  contactNo?: string
  supervisorName?: string
  crateCountAtWeighing: number
  grossWeightKg: number
  actualRejectionPct: number
  slipPhoto?: File | null
}

/**
 * Context for the weighing entry form — auto-filled reference fields, from
 * `GET /weighing/pending` (`PendingTripRead`) plus a couple of fields the
 * mock can enrich that the real backend cannot yet (see api.ts): the real
 * `PendingTripRead` has no MH number or village — those stay `undefined`
 * against the real API rather than being invented. There is no contract
 * rejection % here anymore — the rejection rate is a fixed constant
 * (backend app/core/constants.py), not read from any contract.
 */
export interface WeighingContext {
  vehicleTripId: EntityId
  harvestId: EntityId
  vehicleNo?: string
  driverName?: string
  harvestNumCrates?: number
  approxWeightKg?: string
  farmerName: string
  variety?: string
  harvestDate: string
  mhNumber?: string
  villageName?: string
}

export interface WeighingRow {
  record: WeighingRecord
  /** Undefined against the real API — see api.ts, no endpoint returns farmer context for an already-weighed trip. */
  farmerName?: string
  vehicleNo?: string
}
