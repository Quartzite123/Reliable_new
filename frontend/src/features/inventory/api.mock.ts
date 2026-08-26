import { ApiError } from '@/api/httpClient'
import { mockDelay } from '@/api/mockDelay'
import { materialsStore } from '@/features/itemMaster/mockStore'
import { bomEntriesStore } from '@/features/bom/mockStore'
import type { EntityId } from '@/types/common'
import { allocateStockMovementId, currentStockFor, stockMovementsStore } from './mockStore'
import type {
  AdjustmentInput,
  MaterialStockLevel,
  OrderCalcRequest,
  OrderCalcResponse,
  StockInInput,
  StockMovement,
  StockMovementRow,
} from './types'

function materialLabel(materialId: EntityId): string {
  const material = materialsStore.find((m) => m.id === materialId)
  return material ? `${material.materialType} — ${material.variantName}` : 'Unknown material'
}

/** Always computed — never a manually editable frontend value (prompt.md §16). */
async function computeStockLevels(): Promise<MaterialStockLevel[]> {
  await mockDelay()
  return materialsStore
    .filter((m) => m.isActive)
    .map((material) => {
      const currentStock = currentStockFor(material.id)
      return {
        materialId: material.id,
        materialLabel: `${material.materialType} — ${material.variantName}`,
        unitOfMeasure: material.unitOfMeasure,
        currentStock,
        reorderPoint: material.reorderPoint ?? 0,
        isLow: currentStock < (material.reorderPoint ?? 0),
      }
    })
}

export const inventoryApiMock = {
  listStockLevels: computeStockLevels,

  async listLowStockAlerts(): Promise<MaterialStockLevel[]> {
    const levels = await computeStockLevels()
    return levels.filter((l) => l.isLow)
  },

  async listMovements(): Promise<StockMovementRow[]> {
    await mockDelay()
    return [...stockMovementsStore]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((movement) => ({ movement, materialLabel: materialLabel(movement.materialId) }))
  },

  async listMovementsForMaterial(materialId: EntityId): Promise<StockMovement[]> {
    await mockDelay()
    return [...stockMovementsStore]
      .filter((m) => m.materialId === materialId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 20)
  },

  async stockIn(input: StockInInput): Promise<StockMovement> {
    await mockDelay(400)
    if (!materialsStore.some((m) => m.id === input.materialId)) {
      throw new ApiError(404, { message: 'Material not found.' })
    }
    const movement: StockMovement = {
      id: allocateStockMovementId(),
      materialId: input.materialId,
      movementType: 'in',
      quantity: Math.abs(input.quantity),
      date: input.date,
      supplierName: input.supplierName,
      reference: input.reference,
      createdBy: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    stockMovementsStore.push(movement)
    return movement
  },

  /** Damaged-box/discrepancy corrections are the Inventory Manager's domain, never the packaging worker's (prompt.md §16). */
  async adjust(input: AdjustmentInput): Promise<StockMovement> {
    await mockDelay(400)
    if (!materialsStore.some((m) => m.id === input.materialId)) {
      throw new ApiError(404, { message: 'Material not found.' })
    }
    const movement: StockMovement = {
      id: allocateStockMovementId(),
      materialId: input.materialId,
      movementType: 'adjustment',
      quantity: input.quantity,
      date: input.date,
      reason: input.reason,
      createdBy: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    stockMovementsStore.push(movement)
    return movement
  },

  /** Excel's BOM bottom rows as an endpoint: required = qty_per_container × containers; to_order = required − stock. */
  async orderCalculator(input: OrderCalcRequest): Promise<OrderCalcResponse> {
    await mockDelay()
    const entries = bomEntriesStore.filter((e) => e.productId === input.productId)
    const lines = entries
      .map((entry) => {
        const material = materialsStore.find((m) => m.id === entry.materialId)
        if (!material) return null
        const required = entry.qtyPerContainer * input.numContainers
        const currentStock = currentStockFor(material.id)
        return { material, required, currentStock, toOrder: Math.max(0, required - currentStock) }
      })
      .filter((line): line is NonNullable<typeof line> => line !== null)
    return { productId: input.productId, numContainers: input.numContainers, lines }
  },
}
