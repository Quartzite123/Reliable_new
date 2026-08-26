import type { EntityId, Timestamped } from '@/types/common'
import type { MaterialType, ScaleLevel } from '@/features/itemMaster'

/**
 * bom_entries (PHASE_MAP.md §7). Matches BOMEntryRead/Create exactly:
 * `qtyPerContainer` (integer, always present) and `qtyPerBox` (decimal-as-
 * string on Read, drives auto stock-out for `per_box` materials — CLAUDE.md
 * §9). No `containerConfiguration` or `isActive` field exists on the real
 * backend — dropped from this feature (BOM entries are edited in place via
 * PATCH, not soft-deleted).
 */
export interface BomEntry extends Timestamped {
  id: EntityId
  productId: EntityId
  materialId: EntityId
  qtyPerContainer: number
  qtyPerBox?: string
}

export interface BomEntryInput {
  productId: EntityId
  materialId: EntityId
  qtyPerContainer: number
  qtyPerBox?: number
}

export type BomEntryUpdateInput = Partial<BomEntryInput>

export interface BomEntryRow {
  entry: BomEntry
  productId: EntityId
  variety: string
  customerName: string
  packSize: string
  materialType: MaterialType
  variantName: string
  materialLabel: string
  scaleLevel: ScaleLevel
}
