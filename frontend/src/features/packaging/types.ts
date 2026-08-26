import type { EntityId, Timestamped } from '@/types/common'
import type { GrapeVariety } from '@/features/plots'
import type { ComplianceType, PackSize } from './comboSeed'

/**
 * Each row = one Lot; multiple packing runs per harvest are allowed
 * (Business_Rules R31). Decimal fields are strings on Read (CLAUDE.md §9).
 * `netWeightKg`/`actualRejectionPct` are computed server-side, not by the
 * client — same pattern as Weighing.
 */
export interface PackagingRecord extends Timestamped {
  id: EntityId
  harvestId: EntityId
  date?: string
  slipNo?: string
  /** Backend-generated, traceable to plot+date+customer — frontend never computes this (CLAUDE.md §9, Open Question #1). */
  lotId: string
  packSize: PackSize
  complianceType: ComplianceType
  customerId: EntityId
  totalWeightKg: string
  /** Reference only — contract's rejection_percent applied to totalWeightKg, for comparison against actual. */
  contractRejectionKg?: string
  actualRejectionKg?: string
  actualRejectionPct?: string
  netWeightKg?: string
  numBoxes: number
  numPallets?: number
  /** Copied from company_settings at the moment of packing (CLAUDE.md §12 — never hardcoded). */
  ggnNumber?: string
  createdBy: EntityId
}

export interface CreatePackagingInput {
  harvestId: EntityId
  date: string
  slipNo: string
  customerId: EntityId
  packSize: PackSize
  complianceType: ComplianceType
  totalWeightKg: number
  actualRejectionKg: number
  numBoxes: number
  numPallets: number
}

export interface EligibleHarvestForPackaging {
  harvestId: EntityId
  farmerName: string
  plotNumber: string
  variety?: GrapeVariety
  harvestDate: string
  contractRejectionPercent: number
  packingRunsSoFar: number
}

export interface PackagingRow {
  record: PackagingRecord
  farmerName: string
  plotNumber: string
  customerName: string
}

export interface PackagingTraceability {
  farmerId: EntityId
  farmerName: string
  plotId: EntityId
  plotNumber: string
  mhRegistrationNumber?: string
  seasonYear: number
  fieldQcResult?: string
  labResult?: string
}

export interface PackagingDetail {
  record: PackagingRecord
  customerName: string
  traceability: PackagingTraceability
}
