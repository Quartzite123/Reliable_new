import { customersStore } from '@/features/customers/mockStore'
// Imported from the leaf module directly (not the `@/features/packaging`
// barrel) to avoid a require cycle: that barrel pulls in packaging's
// api.mock.ts, which imports bom/mockStore.ts, which imports this file.
import { VALID_COMBOS } from '@/features/packaging/comboSeed'
import type { Material, Product } from './types'

const now = new Date().toISOString()

/**
 * Realistic packing-material catalog seeded 2026-08-11 for the CEO demo.
 * `currentStock` here is always a placeholder (0) — the real value is never
 * read from this literal, it's computed at read time from
 * `stock_movements` (see `itemMaster/api.mock.ts`'s `currentStockFor` overlay
 * and `inventory/mockStore.ts`, which is seeded with matching quantities).
 */
export const materialsStore: Material[] = [
  { id: 1, materialType: 'Box', variantName: 'Taza 4.5 KG Thermacol', unitOfMeasure: 'pieces', scaleLevel: 'per_box', reorderPoint: 3000, isActive: true, currentStock: 0, createdAt: now, updatedAt: now },
  { id: 2, materialType: 'Box', variantName: 'Black 5 KG Thermacol', unitOfMeasure: 'pieces', scaleLevel: 'per_box', reorderPoint: 2000, isActive: true, currentStock: 0, createdAt: now, updatedAt: now },
  { id: 3, materialType: 'Liner Bag', variantName: '4.5 KG Liner', unitOfMeasure: 'pieces', scaleLevel: 'per_box', reorderPoint: 5000, isActive: true, currentStock: 0, createdAt: now, updatedAt: now },
  { id: 4, materialType: 'Liner Bag', variantName: '5 KG Liner', unitOfMeasure: 'pieces', scaleLevel: 'per_box', reorderPoint: 3000, isActive: true, currentStock: 0, createdAt: now, updatedAt: now },
  { id: 5, materialType: 'Puneet', variantName: 'Simple Pouch 4 bag', unitOfMeasure: 'pieces', scaleLevel: 'per_box', reorderPoint: 8000, isActive: true, currentStock: 0, createdAt: now, updatedAt: now },
  { id: 6, materialType: 'Puneet', variantName: 'NK Paper Pouch', unitOfMeasure: 'pieces', scaleLevel: 'per_box', reorderPoint: 5000, isActive: true, currentStock: 0, createdAt: now, updatedAt: now },
  { id: 7, materialType: 'Grape Guard', variantName: 'JK Grape Guard 4.5 KG', unitOfMeasure: 'pieces', scaleLevel: 'per_box', reorderPoint: 3000, isActive: true, currentStock: 0, createdAt: now, updatedAt: now },
  { id: 8, materialType: 'Sticker', variantName: 'OFD Punnet Sticker', unitOfMeasure: 'pieces', scaleLevel: 'per_box', reorderPoint: 10000, isActive: true, currentStock: 0, createdAt: now, updatedAt: now },
  { id: 9, materialType: 'Sticker', variantName: 'FS Barcode', unitOfMeasure: 'pieces', scaleLevel: 'per_box', reorderPoint: 10000, isActive: true, currentStock: 0, createdAt: now, updatedAt: now },
  { id: 10, materialType: 'Angle Board', variantName: 'Corner Post 7X21', unitOfMeasure: 'pieces', scaleLevel: 'per_container', reorderPoint: 84, isActive: true, currentStock: 0, createdAt: now, updatedAt: now },
  { id: 11, materialType: 'Pallet', variantName: 'Standard Wooden Pallet', unitOfMeasure: 'pieces', scaleLevel: 'per_container', reorderPoint: 20, isActive: true, currentStock: 0, createdAt: now, updatedAt: now },
  { id: 12, materialType: 'Strapping Roll', variantName: 'Strapping Roll', unitOfMeasure: 'rolls', scaleLevel: 'per_container', reorderPoint: 4, isActive: true, currentStock: 0, createdAt: now, updatedAt: now },
  { id: 13, materialType: 'Clip', variantName: 'Strapping Clips', unitOfMeasure: 'pieces', scaleLevel: 'per_container', reorderPoint: 254, isActive: true, currentStock: 0, createdAt: now, updatedAt: now },
  { id: 14, materialType: 'Box', variantName: '4 KG Thermacol', unitOfMeasure: 'pieces', scaleLevel: 'per_box', reorderPoint: 2000, isActive: true, currentStock: 0, createdAt: now, updatedAt: now },
]

let nextMaterialId = materialsStore.length + 1
export function allocateMaterialId() {
  return nextMaterialId++
}

/**
 * Seeded from the same valid variety->customer->pack-size combos packaging
 * uses (PHASE_MAP.md §8), one row per compliance type, so every choice a
 * worker can make on the Packaging screen resolves to a real product here
 * for BOM lookup. CLAUDE.md §9 — this hardcoded list is what a live
 * item_master_products query eventually replaces.
 */
function buildProductsSeed(): Product[] {
  const products: Product[] = []
  let sequence = 1
  for (const combo of VALID_COMBOS) {
    const customer = customersStore.find((c) => c.name === combo.customerName)
    if (!customer) continue
    for (const packSize of combo.packSizes) {
      for (const complianceType of ['EU', 'Non-Testing'] as const) {
        products.push({
          id: sequence++,
          variety: combo.variety,
          customerId: customer.id,
          packSize,
          complianceType,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        })
      }
    }
  }
  return products
}

export const productsStore: Product[] = buildProductsSeed()
let nextProductId = productsStore.length + 1
export function allocateProductId() {
  return nextProductId++
}
