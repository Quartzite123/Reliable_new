import { ApiError } from '@/api/httpClient'
import { mockDelay } from '@/api/mockDelay'
import { customersStore } from '@/features/customers/mockStore'
import { materialsStore, productsStore } from '@/features/itemMaster/mockStore'
import type { EntityId } from '@/types/common'
import { allocateBomEntryId, bomEntriesStore } from './mockStore'
import type { BomEntry, BomEntryInput, BomEntryRow, BomEntryUpdateInput } from './types'

function toRow(entry: BomEntry): BomEntryRow | null {
  const product = productsStore.find((p) => p.id === entry.productId)
  const material = materialsStore.find((m) => m.id === entry.materialId)
  if (!product || !material) return null
  const customer = customersStore.find((c) => c.id === product.customerId)
  return {
    entry,
    productId: product.id,
    variety: product.variety,
    customerName: customer?.name ?? 'Unknown',
    packSize: product.packSize,
    materialType: material.materialType,
    variantName: material.variantName,
    materialLabel: `${material.materialType} — ${material.variantName}`,
    scaleLevel: material.scaleLevel,
  }
}

export const bomApiMock = {
  async list(): Promise<BomEntryRow[]> {
    await mockDelay()
    return bomEntriesStore.map(toRow).filter((row): row is BomEntryRow => row !== null)
  },

  async listByProduct(productId: EntityId): Promise<BomEntryRow[]> {
    await mockDelay()
    return bomEntriesStore
      .filter((e) => e.productId === productId)
      .map(toRow)
      .filter((row): row is BomEntryRow => row !== null)
  },

  async getById(id: EntityId): Promise<BomEntryRow> {
    await mockDelay()
    const entry = bomEntriesStore.find((e) => e.id === id)
    if (!entry) throw new ApiError(404, { message: 'BOM entry not found.' })
    const row = toRow(entry)
    if (!row) throw new ApiError(404, { message: 'Related product/material not found.' })
    return row
  },

  async create(input: BomEntryInput): Promise<BomEntry> {
    await mockDelay(400)
    const entry: BomEntry = {
      id: allocateBomEntryId(),
      productId: input.productId,
      materialId: input.materialId,
      qtyPerContainer: input.qtyPerContainer,
      qtyPerBox: input.qtyPerBox !== undefined ? String(input.qtyPerBox) : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    bomEntriesStore.push(entry)
    return entry
  },

  async update(id: EntityId, input: BomEntryUpdateInput): Promise<BomEntry> {
    await mockDelay(400)
    const index = bomEntriesStore.findIndex((e) => e.id === id)
    if (index === -1) throw new ApiError(404, { message: 'BOM entry not found.' })
    bomEntriesStore[index] = {
      ...bomEntriesStore[index],
      ...input,
      qtyPerBox: input.qtyPerBox !== undefined ? String(input.qtyPerBox) : bomEntriesStore[index].qtyPerBox,
      updatedAt: new Date().toISOString(),
    }
    return bomEntriesStore[index]
  },
}
