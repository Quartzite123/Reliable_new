import { httpClient } from '@/api/httpClient'
import type { EntityId } from '@/types/common'
import type { Customer } from '@/features/customers'
import type { Material, Product } from '@/features/itemMaster'
import type { BomEntry, BomEntryInput, BomEntryRow, BomEntryUpdateInput } from './types'

/** No `GET /bom/{id}` route exists — detail is composed from the list (verified via openapi.json). */
async function toRows(entries: BomEntry[]): Promise<BomEntryRow[]> {
  const [products, materials, customers] = await Promise.all([
    httpClient.get<Product[]>('/inventory/products'),
    httpClient.get<Material[]>('/inventory/materials'),
    httpClient.get<Customer[]>('/customers'),
  ])
  const rows: BomEntryRow[] = []
  for (const entry of entries) {
    const product = products.find((p) => p.id === entry.productId)
    const material = materials.find((m) => m.id === entry.materialId)
    if (!product || !material) continue
    const customer = customers.find((c) => c.id === product.customerId)
    rows.push({
      entry,
      productId: product.id,
      variety: product.variety,
      customerName: customer?.name ?? 'Unknown',
      packSize: product.packSize,
      materialType: material.materialType,
      variantName: material.variantName,
      materialLabel: `${material.materialType} — ${material.variantName}`,
      scaleLevel: material.scaleLevel,
    })
  }
  return rows
}

export const bomApiReal = {
  async list(): Promise<BomEntryRow[]> {
    const entries = await httpClient.get<BomEntry[]>('/bom')
    return toRows(entries)
  },

  /** `GET /bom?product_id=` is a real, verified query param (openapi.json) — used by the grouped-by-product BOM list. */
  async listByProduct(productId: EntityId): Promise<BomEntryRow[]> {
    const entries = await httpClient.get<BomEntry[]>(`/bom?product_id=${productId}`)
    return toRows(entries)
  },

  async getById(id: EntityId): Promise<BomEntryRow> {
    const entries = await httpClient.get<BomEntry[]>('/bom')
    const entry = entries.find((e) => e.id === id)
    if (!entry) throw new Error('BOM entry not found.')
    const rows = await toRows([entry])
    if (rows.length === 0) throw new Error('Related product/material not found.')
    return rows[0]
  },

  create: (input: BomEntryInput) => httpClient.post<BomEntry>('/bom', input),
  update: (id: EntityId, input: BomEntryUpdateInput) => httpClient.patch<BomEntry>(`/bom/${id}`, input),
}
