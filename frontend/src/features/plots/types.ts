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
  /** @deprecated legacy/denormalized — still populated by the backend, but nothing reads it for display anymore. Use varietyNames (plot-level) or a registration's own varietyName (registration-scoped). */
  variety?: GrapeVariety
  /** Every variety this plot carries (plot_varieties) — authoritative, plot-level. */
  varietyNames?: string[]
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
  plotVarietyId?: EntityId
  /** The authoritative variety for this specific registration — every registration-scoped screen (weighing, lab samples, packaging, harvests, arrival QC, contracts, palletisation, this list) reads this, not plot.variety. */
  varietyName?: string
  seasonYear: number
  status: SeasonRegistrationStatus
  registeredBy: EntityId
  registeredAt: string
  notes?: string
}

/** A single variety a plot carries (plot_varieties) — one per registration pipeline (R57). */
export interface PlotVariety {
  id: EntityId
  plotId: EntityId
  varietyName: string
  areaAcres?: string
  createdAt: string
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
 * The Field QC fields alone, with no registration/variety context attached
 * yet — shared base for the follow-up case (attaches to an existing
 * registration) and the multi-variety registration case (attaches to a
 * variety row that doesn't have a registration yet). `result` is required
 * — the backend's FieldQCCreate schema requires an explicit Pass/Fail from
 * the inspector, it is NOT computed server-side from the percentage fields
 * (verified via openapi.json).
 */
export interface FieldQcEntryInput {
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

export interface FollowUpFieldQcInput extends FieldQcEntryInput {
  seasonRegistrationId: EntityId
}

/** One row in the multi-variety registration form — a variety, its share of the plot's area, and its own independent Field QC (R57: each variety is a fully separate pipeline). */
export interface VarietyEntryInput extends FieldQcEntryInput {
  variety: GrapeVariety
  areaAcres?: number
}

/**
 * What the Field Worker submits from the combined Plot + Field QC screen
 * (Business_Rules R15a). Always at least one variety — the common,
 * single-variety case is `varieties.length === 1`; a plot the CEO
 * confirmed can rarely carry more than one variety (2026-09-03) is
 * `varieties.length > 1`, each with its own Field QC.
 */
export interface RegisterPlotMultiVarietyInput {
  farmerId: EntityId
  plotId?: EntityId // set when re-registering an existing plot for a new season
  plotNumber: string
  mhRegistrationNumber?: string
  areaAcres?: number
  village?: string
  taluka?: string
  surveyNo?: string
  gpsLat?: number
  gpsLong?: number
  pruningDate?: string
  approxHarvestDate?: string
  seasonYear: number
  varieties: VarietyEntryInput[]
}

/**
 * Per-variety outcome of a `registerMultipleVarieties` call — the chain is
 * sequential and non-transactional (see api.ts), so one variety can
 * succeed while another fails. `error` is the raw caught error (unknown),
 * left to the caller to format with `toFriendlyMessage` — api.ts doesn't
 * import UI-facing formatting utilities.
 */
export interface VarietyRegistrationResult {
  variety: string
  success: boolean
  registrationId?: EntityId
  error?: unknown
}

export interface RegisterPlotMultiVarietyResult {
  plot: Plot
  results: VarietyRegistrationResult[]
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
  plotVarieties: PlotVariety[]
}
