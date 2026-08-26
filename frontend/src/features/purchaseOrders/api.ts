import { httpClient } from '@/api/httpClient'
import type { EntityId } from '@/types/common'
import type { CreatePurchaseOrderInput, PurchaseOrder, PurchaseOrderStatus, SupplierSuggestion } from './types'

/**
 * No `/purchase-orders/suppliers` route exists (verified via openapi.json).
 * Supplier autocomplete is a denormalized list built client-side from
 * previously used supplier names/addresses/GST on existing POs — matches
 * CLAUDE.md §9's own description of this as "not a full supplier master".
 */
export const purchaseOrdersApiReal = {
  async listSuppliers(): Promise<SupplierSuggestion[]> {
    const orders = await httpClient.get<PurchaseOrder[]>('/purchase-orders')
    const byName = new Map<string, SupplierSuggestion>()
    for (const po of orders) {
      if (!byName.has(po.supplierName)) {
        byName.set(po.supplierName, { name: po.supplierName, address: po.supplierAddress ?? '', gst: po.supplierGst })
      }
    }
    return [...byName.values()]
  },

  list: () => httpClient.get<PurchaseOrder[]>('/purchase-orders'),
  getById: (id: EntityId) => httpClient.get<PurchaseOrder>(`/purchase-orders/${id}`),
  create: (input: CreatePurchaseOrderInput) => httpClient.post<PurchaseOrder>('/purchase-orders', input),
  setStatus: (id: EntityId, status: PurchaseOrderStatus) =>
    httpClient.patch<PurchaseOrder>(`/purchase-orders/${id}/status`, { status }),
}
