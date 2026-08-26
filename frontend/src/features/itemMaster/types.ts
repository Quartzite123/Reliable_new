import type { EntityId, Timestamped } from '@/types/common'
import type { ComplianceType, PackSize } from '@/features/packaging'

/**
 * The real backend models item master as two flat catalogs — `Material`
 * (packing materials only) and `Product` (finished-product combos) — with no
 * raw-material catalog at all (verified via openapi.json: `/inventory/materials`,
 * `/inventory/products`, no raw-material routes). The old 3-category
 * (packing/raw/finished) `ItemMasterEntry` union and Raw Material screens are
 * dropped accordingly — Purchase Orders (farm inputs) were already
 * documented as unconnected to item master (CLAUDE.md §8), so nothing
 * downstream depended on the raw-material catalog being real.
 */
export type MaterialType =
  | 'Box'
  | 'Liner Bag'
  | 'Puneet'
  | 'Pouch'
  | 'Grape Guard'
  | 'Angle Board'
  | 'Pallet'
  | 'Strapping Roll'
  | 'Clip'
  | 'Sticker'

export const MATERIAL_TYPES: MaterialType[] = [
  'Box',
  'Liner Bag',
  'Puneet',
  'Pouch',
  'Grape Guard',
  'Angle Board',
  'Pallet',
  'Strapping Roll',
  'Clip',
  'Sticker',
]

export type UnitOfMeasure = 'pieces' | 'kg' | 'rolls'
export const UNITS_OF_MEASURE: UnitOfMeasure[] = ['pieces', 'kg', 'rolls']

/** Per-container materials (angle boards, pallets, clips, straps) deduct at Container Loading, a future phase — not here (CLAUDE.md §9). */
export type ScaleLevel = 'per_box' | 'per_container'

export interface Material extends Timestamped {
  id: EntityId
  materialType: MaterialType
  variantName: string
  unitOfMeasure: UnitOfMeasure
  scaleLevel: ScaleLevel
  reorderPoint?: number
  isActive: boolean
  /** Server-computed from stock_movements — never write this client-side. */
  currentStock: number
}

export interface MaterialInput {
  materialType: MaterialType
  variantName: string
  unitOfMeasure: UnitOfMeasure
  scaleLevel: ScaleLevel
  reorderPoint?: number
}

export type MaterialUpdateInput = Partial<MaterialInput & { isActive: boolean }>

/** item_master_products (PHASE_MAP.md §7) — a valid variety x customer x pack-size x compliance combination. */
export interface Product extends Timestamped {
  id: EntityId
  variety: string
  customerId: EntityId
  packSize: PackSize
  complianceType: ComplianceType
  isActive: boolean
}

export interface ProductInput {
  variety: string
  customerId: EntityId
  packSize: PackSize
  complianceType: ComplianceType
}

export type ProductUpdateInput = Partial<ProductInput & { isActive: boolean }>
