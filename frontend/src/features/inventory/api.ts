import { httpClient } from '@/api/httpClient'
import type { EntityId } from '@/types/common'
import type { Material } from '@/features/itemMaster'
import type {
  AdjustmentInput,
  LowStockAlert,
  MaterialStockLevel,
  OrderCalcRequest,
  OrderCalcResponse,
  StockInInput,
  StockMovement,
  StockMovementRow,
} from './types'

function materialLabel(material: Material): string {
  return `${material.materialType} — ${material.variantName}`
}

/** No `/inventory/stock-levels` route — derived from `GET /inventory/materials`'s `current_stock` field. */
async function computeStockLevels(): Promise<MaterialStockLevel[]> {
  const materials = await httpClient.get<Material[]>('/inventory/materials')
  return materials
    .filter((m) => m.isActive)
    .map((material) => ({
      materialId: material.id,
      materialLabel: materialLabel(material),
      unitOfMeasure: material.unitOfMeasure,
      currentStock: material.currentStock,
      reorderPoint: material.reorderPoint ?? 0,
      isLow: material.currentStock < (material.reorderPoint ?? 0),
    }))
}

export const inventoryApiReal = {
  listStockLevels: computeStockLevels,

  async listLowStockAlerts(): Promise<MaterialStockLevel[]> {
    const alerts = await httpClient.get<LowStockAlert[]>('/inventory/alerts')
    return alerts.map((a) => ({
      materialId: a.material.id,
      materialLabel: materialLabel(a.material),
      unitOfMeasure: a.material.unitOfMeasure,
      currentStock: a.currentStock,
      reorderPoint: a.reorderPoint,
      isLow: true,
    }))
  },

  async listMovements(): Promise<StockMovementRow[]> {
    const [movements, materials] = await Promise.all([
      httpClient.get<StockMovement[]>('/inventory/movements'),
      httpClient.get<Material[]>('/inventory/materials'),
    ])
    return movements.map((movement) => {
      const material = materials.find((m) => m.id === movement.materialId)
      return { movement, materialLabel: material ? materialLabel(material) : 'Unknown material' }
    })
  },

  /** `GET /inventory/movements?material_id=` is a real, verified query param (openapi.json) — used for a material's Stock History panel. */
  async listMovementsForMaterial(materialId: EntityId): Promise<StockMovement[]> {
    const movements = await httpClient.get<StockMovement[]>(`/inventory/movements?material_id=${materialId}`)
    return [...movements].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 20)
  },

  stockIn: (input: StockInInput) => httpClient.post<StockMovement>('/inventory/stock-in', input),
  adjust: (input: AdjustmentInput) => httpClient.post<StockMovement>('/inventory/adjustments', input),
  orderCalculator: (input: OrderCalcRequest) => httpClient.post<OrderCalcResponse>('/inventory/order-calculator', input),
}
