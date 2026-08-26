import type { EntityId, Timestamped } from '@/types/common'
import type { Material } from '@/features/itemMaster'

export type StockMovementType = 'in' | 'auto_out' | 'adjustment'

/** stock_movements (PHASE_MAP.md §7) — current stock is always SUM(quantity) over these, never a stored column. */
export interface StockMovement extends Timestamped {
  id: EntityId
  materialId: EntityId
  movementType: StockMovementType
  /** Positive for in/found, negative for out/lost. */
  quantity: number
  date?: string
  supplierName?: string
  reference?: string
  reason?: string
  packagingRecordId?: EntityId
  createdBy: EntityId
}

export interface StockInInput {
  materialId: EntityId
  quantity: number
  date: string
  supplierName: string
  reference?: string
}

export interface AdjustmentInput {
  materialId: EntityId
  quantity: number
  date: string
  reason: string
}

/** No dedicated `/inventory/stock-levels` endpoint — derived from `Material.currentStock` (already computed server-side). */
export interface MaterialStockLevel {
  materialId: EntityId
  materialLabel: string
  unitOfMeasure: string
  currentStock: number
  reorderPoint: number
  isLow: boolean
}

export interface LowStockAlert {
  material: Material
  currentStock: number
  reorderPoint: number
  shortfall: number
}

export interface StockMovementRow {
  movement: StockMovement
  materialLabel: string
}

export interface OrderCalcRequest {
  productId: EntityId
  numContainers: number
}

export interface OrderCalcLine {
  material: Material
  required: number
  currentStock: number
  toOrder: number
}

export interface OrderCalcResponse {
  productId: EntityId
  numContainers: number
  lines: OrderCalcLine[]
}
