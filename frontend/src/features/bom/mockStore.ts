import { materialsStore, productsStore } from '@/features/itemMaster/mockStore'
import type { BomEntry } from './types'

const now = new Date().toISOString()

/**
 * Seed BOM only for one representative product (Thompson Seedless / MASCL /
 * 4.5 Kg / EU) — enough to demonstrate the Packaging -> auto stock-out chain
 * without hand-building a BOM for every variety x customer x pack-size
 * combination (that's ongoing Admin/Inventory Manager setup work, not
 * something to fake at scaffold time).
 */
function buildSeed(): BomEntry[] {
  const product = productsStore.find((p) => p.variety === 'Thompson Seedless' && p.packSize === '4.5 Kg' && p.complianceType === 'EU')
  const linerBag = materialsStore.find((m) => m.materialType === 'Liner Bag')
  const grapeGuard = materialsStore.find((m) => m.materialType === 'Grape Guard')
  const boxSticker = materialsStore.find((m) => m.materialType === 'Sticker')

  if (!product || !linerBag || !grapeGuard || !boxSticker) return []

  return [
    { id: 1, productId: product.id, materialId: linerBag.id, qtyPerContainer: 1000, qtyPerBox: '1', createdAt: now, updatedAt: now },
    { id: 2, productId: product.id, materialId: grapeGuard.id, qtyPerContainer: 2000, qtyPerBox: '2', createdAt: now, updatedAt: now },
    { id: 3, productId: product.id, materialId: boxSticker.id, qtyPerContainer: 1000, qtyPerBox: '1', createdAt: now, updatedAt: now },
  ]
}

export const bomEntriesStore: BomEntry[] = buildSeed()

let nextBomEntryId = bomEntriesStore.length + 1
export function allocateBomEntryId() {
  return nextBomEntryId++
}
