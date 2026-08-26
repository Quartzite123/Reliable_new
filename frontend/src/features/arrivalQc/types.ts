import type { EntityId, Timestamped } from '@/types/common'
import type { OverallObservation, QcResult } from '@/features/plots'

/**
 * Per harvest event (Business_Rules R21/R29, PHASE_MAP.md §7) — multiple rows
 * allowed for follow-up after a fail. All percent fields are decimal-as-
 * string on Read (CLAUDE.md §9). `result` is submitted directly by the
 * inspector, not computed server- or client-side (matches the Field QC
 * pattern in features/plots — ArrivalQCCreate.result is required).
 */
export interface ArrivalQc extends Timestamped {
  id: EntityId
  harvestId: EntityId
  inspectionDate: string
  fruitColourGreenPct?: string
  fruitColourMilkyPct?: string
  fruitColourYellowPct?: string
  tssPercent?: string
  thripsPercent?: string
  bhuriPercent?: string
  blackSpotPercent?: string
  cercosporaPercent?: string
  overallObservation?: OverallObservation
  result: QcResult
  notes?: string
  inspectedBy: EntityId
}

export interface ArrivalQcInput {
  harvestId: EntityId
  inspectionDate: string
  fruitColourGreenPct: number
  fruitColourMilkyPct: number
  fruitColourYellowPct: number
  tssPercent: number
  thripsPercent: number
  bhuriPercent: number
  blackSpotPercent: number
  cercosporaPercent: number
  overallObservation: OverallObservation
  result: QcResult
  notes?: string
}

export interface EligibleHarvestForArrivalQc {
  harvestId: EntityId
  farmerName: string
  plotNumber: string
  harvestDate: string
  seasonYear: number
}

export interface ArrivalQcRow {
  record: ArrivalQc
  farmerName: string
  plotNumber: string
  harvestDate: string
}

export interface ArrivalQcDetail {
  harvestId: EntityId
  farmerName: string
  plotNumber: string
  harvestDate: string
  history: ArrivalQc[]
}
