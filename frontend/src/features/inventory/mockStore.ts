import type { EntityId } from '@/types/common'
import type { StockMovement } from './types'

const now = new Date().toISOString()

/**
 * Season-opening stock-in seeded 2026-08-11 for the CEO demo — one 'in'
 * movement per material, sized to land `currentStockFor(materialId)` at the
 * exact target stock level (materials/mockStore.ts's `materialsStore` lists
 * the 14 materials these ids refer to). Materials #3 (Liner Bag, 4.5 KG) and
 * #14 (Thermacol 4 KG) are deliberately seeded below their reorder point to
 * demonstrate the low-stock alert; #12 (Strapping Roll) gets no movement at
 * all, landing it at zero stock to demonstrate the critical/out-of-stock case.
 */
export const stockMovementsStore: StockMovement[] = [
  { id: 1, materialId: 1, movementType: 'in', quantity: 14229, date: '2025-12-05', supplierName: 'Nashik Packaging Co.', createdBy: 8, createdAt: now, updatedAt: now },
  { id: 2, materialId: 2, movementType: 'in', quantity: 10214, date: '2025-12-05', supplierName: 'Nashik Packaging Co.', createdBy: 8, createdAt: now, updatedAt: now },
  { id: 3, materialId: 3, movementType: 'in', quantity: 4690, date: '2025-12-06', supplierName: 'Poly Pack Traders', createdBy: 8, createdAt: now, updatedAt: now },
  { id: 4, materialId: 4, movementType: 'in', quantity: 10195, date: '2025-12-06', supplierName: 'Poly Pack Traders', createdBy: 8, createdAt: now, updatedAt: now },
  { id: 5, materialId: 5, movementType: 'in', quantity: 10464, date: '2025-12-07', supplierName: 'Poly Pack Traders', createdBy: 8, createdAt: now, updatedAt: now },
  { id: 6, materialId: 6, movementType: 'in', quantity: 28750, date: '2025-12-07', supplierName: 'Poly Pack Traders', createdBy: 8, createdAt: now, updatedAt: now },
  { id: 7, materialId: 7, movementType: 'in', quantity: 14315, date: '2025-12-08', supplierName: 'Nashik Packaging Co.', createdBy: 8, createdAt: now, updatedAt: now },
  { id: 8, materialId: 8, movementType: 'in', quantity: 38000, date: '2025-12-09', supplierName: 'Label Works', createdBy: 8, createdAt: now, updatedAt: now },
  { id: 9, materialId: 9, movementType: 'in', quantity: 80000, date: '2025-12-09', supplierName: 'Label Works', createdBy: 8, createdAt: now, updatedAt: now },
  { id: 10, materialId: 10, movementType: 'in', quantity: 147, date: '2025-12-10', supplierName: 'Timber Corner Pvt Ltd', createdBy: 8, createdAt: now, updatedAt: now },
  { id: 11, materialId: 11, movementType: 'in', quantity: 55, date: '2025-12-10', supplierName: 'Timber Corner Pvt Ltd', createdBy: 8, createdAt: now, updatedAt: now },
  // Material #12 (Strapping Roll) intentionally has no stock-in movement — stays at 0 to demo a critical out-of-stock alert.
  { id: 12, materialId: 13, movementType: 'in', quantity: 1000, date: '2025-12-11', supplierName: 'Strap & Seal', createdBy: 8, createdAt: now, updatedAt: now },
  { id: 13, materialId: 14, movementType: 'in', quantity: 820, date: '2025-12-11', supplierName: 'Nashik Packaging Co.', createdBy: 8, createdAt: now, updatedAt: now },
]

let nextStockMovementId = stockMovementsStore.length + 1
export function allocateStockMovementId() {
  return nextStockMovementId++
}

/**
 * Service-layer hook for Phase 8 (Packaging) -> Phase 9B (Inventory), per
 * CLAUDE.md §9: "Implement as a service-layer hook, not frontend logic — the
 * packaging worker never sees this happen." The packaging mock API calls
 * this directly after creating a packaging_records row; no packaging
 * component ever touches stock_movements.
 */
export function recordAutoStockOut(materialId: EntityId, quantity: number, packagingRecordId: EntityId, date: string) {
  stockMovementsStore.push({
    id: allocateStockMovementId(),
    materialId,
    movementType: 'auto_out',
    quantity: -Math.abs(quantity),
    date,
    packagingRecordId,
    createdBy: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
}

export function currentStockFor(materialId: EntityId): number {
  return stockMovementsStore.filter((m) => m.materialId === materialId).reduce((sum, m) => sum + m.quantity, 0)
}
