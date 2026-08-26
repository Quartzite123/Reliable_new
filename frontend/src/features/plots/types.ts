import type { EntityId, Timestamped } from '@/types/common'
import type { SeasonRegistrationStatus } from '@/types/season'

/** PHASE_MAP.md §8 reference/seed list. */
export type GrapeVariety =
  | 'Sonaka'
  | 'Thompson Seedless'
  | 'Sharad Seedless'
  | 'Tas-e-Ganesh'
  | 'Flame'
  | 'Crimson'
  | 'Black Jumbo Seedless'
  | 'Other'

export const GRAPE_VARIETIES: GrapeVariety[] = [
  'Sonaka',
  'Thompson Seedless',
  'Sharad Seedless',
  'Tas-e-Ganesh',
  'Flame',
  'Crimson',
  'Black Jumbo Seedless',
  'Other',
]

/**
 * Permanent, traceable farm unit — persists across seasons (Business_Rules R4-R7).
 * area_acres/gps_lat/gps_long come back from the backend as decimal strings,
 * not numbers (verified via openapi.json — Numeric columns serialize as
 * strings), and every field but id/farmerId/plotNumber is nullable there.
 */
export interface Plot extends Timestamped {
  id: EntityId
  farmerId: EntityId
  plotNumber: string
  mhRegistrationNumber?: string
  variety?: GrapeVariety
  areaAcres?: string
  village?: string
  taluka?: string
  surveyNo?: string
  gpsLat?: string
  gpsLong?: string
  pruningDate?: string
  approxHarvestDate?: string
}

/** The plot+season join — the record the whole pipeline status machine hangs off (PHASE_MAP.md §7). */
export interface SeasonRegistration extends Timestamped {
  id: EntityId
  plotId: EntityId
  seasonYear: number
  status: SeasonRegistrationStatus
  registeredBy: EntityId
  registeredAt: string
  notes?: string
}

export type FruitColour = 'Green' | 'Milky Green' | 'Yellow'
export type OverallObservation = 'Good' | 'Very Good' | 'Excellent'
export type QcResult = 'Pass' | 'Fail'

export interface FieldQc extends Timestamped {
  id: EntityId
  seasonRegistrationId: EntityId
  inspectionDate: string
  plannedSamplingDate?: string
  tentativeHarvestDate?: string
  fruitColour?: FruitColour
  tssPercent?: string
  thripsPercent?: string
  bhuriPercent?: string
  blackSpotPercent?: string
  cercosporaPercent?: string
  overallObservation?: OverallObservation
  exportableFruitPercent?: string
  notes?: string
  result: QcResult
  inspectedBy: EntityId
}

/**
 * What the Field Worker submits from the combined Plot + Field QC screen
 * (Business_Rules R15a). `result` is required — the backend's FieldQCCreate
 * schema requires an explicit Pass/Fail from the inspector, it is NOT
 * computed server-side from the percentage fields (verified via
 * openapi.json). The previous mock's threshold-based `evaluateFieldQcResult`
 * heuristic was a placeholder standing in for a field the UI wasn't
 * collecting yet — this restores the direct-entry behavior the original
 * screen spec (PHASE_MAP.md §10.2, 6.5 Section B) actually described.
 */
export interface RegisterPlotWithFieldQcInput {
  farmerId: EntityId
  plotId?: EntityId // set when re-registering an existing plot for a new season
  plotNumber: string
  mhRegistrationNumber?: string
  variety?: GrapeVariety
  areaAcres?: number
  village?: string
  taluka?: string
  surveyNo?: string
  gpsLat?: number
  gpsLong?: number
  pruningDate?: string
  approxHarvestDate?: string
  seasonYear: number
  inspectionDate: string
  plannedSamplingDate?: string
  tentativeHarvestDate?: string
  fruitColour?: FruitColour
  tssPercent?: number
  thripsPercent?: number
  bhuriPercent?: number
  blackSpotPercent?: number
  cercosporaPercent?: number
  overallObservation?: OverallObservation
  exportableFruitPercent?: number
  notes?: string
  result: QcResult
}

export interface FollowUpFieldQcInput {
  seasonRegistrationId: EntityId
  inspectionDate: string
  plannedSamplingDate?: string
  tentativeHarvestDate?: string
  fruitColour?: FruitColour
  tssPercent?: number
  thripsPercent?: number
  bhuriPercent?: number
  blackSpotPercent?: number
  cercosporaPercent?: number
  overallObservation?: OverallObservation
  exportableFruitPercent?: number
  notes?: string
  result: QcResult
}

/** Denormalized read shape for list screens — one row per plot's most recent season registration. */
export interface PlotSummary {
  plot: Plot
  latestRegistration: SeasonRegistration | null
}

export interface PlotDetail {
  plot: Plot
  registrations: SeasonRegistration[]
  fieldQcByRegistration: Record<EntityId, FieldQc[]>
}
