import { ApiError } from '@/api/httpClient'
import { mockDelay } from '@/api/mockDelay'
import { amountInWordsIndian } from '@/utils/indianNumber'
import type { EntityId } from '@/types/common'
import { allocateLineItemId, allocatePoId, mockGeneratePoNumber, purchaseOrdersStore, suppliersStore } from './mockStore'
import type { CreatePurchaseOrderInput, PurchaseOrder, PurchaseOrderLineItem, PurchaseOrderStatus, SupplierSuggestion } from './types'

function computeTotals(input: CreatePurchaseOrderInput) {
  const lineItems: PurchaseOrderLineItem[] = input.lineItems.map((item, index) => ({
    id: allocateLineItemId(),
    srNo: index + 1,
    particulars: item.particulars,
    hsnCode: item.hsnCode,
    qtyKg: String(item.qtyKg),
    units: item.units,
    kgPerUnit: String(item.kgPerUnit),
    make: item.make,
    rate: String(item.rate),
    gstPercent: String(item.gstPercent),
    amount: String(Math.round(item.qtyKg * item.rate * 100) / 100),
  }))

  const assessableValue = Math.round(input.lineItems.reduce((sum, item) => sum + item.qtyKg * item.rate, 0) * 100) / 100
  const cgstTotal = Math.round(input.lineItems.reduce((sum, item) => sum + (item.qtyKg * item.rate * item.gstPercent) / 200, 0) * 100) / 100
  const sgstTotal = cgstTotal

  const freightAmount = input.freight && /^\d+(\.\d+)?$/.test(input.freight.trim()) ? Number(input.freight) : 0
  const grandTotal = Math.round((assessableValue + cgstTotal + sgstTotal + freightAmount + input.otherCharges) * 100) / 100

  return { lineItems, assessableValue, cgstTotal, sgstTotal, grandTotal }
}

export const purchaseOrdersApiMock = {
  async listSuppliers(): Promise<SupplierSuggestion[]> {
    await mockDelay(150)
    return suppliersStore
  },

  async list(): Promise<PurchaseOrder[]> {
    await mockDelay()
    return [...purchaseOrdersStore].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  },

  async getById(id: EntityId): Promise<PurchaseOrder> {
    await mockDelay()
    const po = purchaseOrdersStore.find((p) => p.id === id)
    if (!po) throw new ApiError(404, { message: 'Purchase order not found.' })
    return po
  },

  async create(input: CreatePurchaseOrderInput): Promise<PurchaseOrder> {
    await mockDelay(500)

    const { lineItems, assessableValue, cgstTotal, sgstTotal, grandTotal } = computeTotals(input)
    const sequence = purchaseOrdersStore.length + 1

    if (!suppliersStore.some((s) => s.name === input.supplierName)) {
      suppliersStore.push({ name: input.supplierName, address: input.supplierAddress ?? '', gst: input.supplierGst })
    }

    const po: PurchaseOrder = {
      id: allocatePoId(),
      poNumber: mockGeneratePoNumber(input.poDate, sequence),
      poDate: input.poDate,
      paymentTerms: input.paymentTerms,
      supplierRef: input.supplierRef,
      otherRefs: input.otherRefs,
      dispatchThrough: input.dispatchThrough,
      destination: input.destination,
      supplierName: input.supplierName,
      supplierAddress: input.supplierAddress,
      supplierEmail: input.supplierEmail,
      supplierGst: input.supplierGst,
      lineItems,
      assessableValue: String(assessableValue),
      cgstTotal: String(cgstTotal),
      sgstTotal: String(sgstTotal),
      freight: input.freight,
      otherCharges: String(input.otherCharges),
      grandTotal: String(grandTotal),
      totalInWords: amountInWordsIndian(grandTotal),
      status: 'draft',
      createdBy: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    purchaseOrdersStore.push(po)
    return po
  },

  async setStatus(id: EntityId, status: PurchaseOrderStatus): Promise<PurchaseOrder> {
    await mockDelay(300)
    const po = purchaseOrdersStore.find((p) => p.id === id)
    if (!po) throw new ApiError(404, { message: 'Purchase order not found.' })
    po.status = status
    po.updatedAt = new Date().toISOString()
    return po
  },
}
