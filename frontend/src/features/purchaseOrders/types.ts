import type { EntityId, Timestamped } from '@/types/common'

export type PurchaseOrderStatus = 'draft' | 'issued' | 'completed'

/** Decimal fields are strings on Read (CLAUDE.md §9). `amount`/totals are computed server-side, never by the client. */
export interface PurchaseOrderLineItem {
  id: EntityId
  srNo?: number
  particulars: string
  hsnCode?: string
  qtyKg?: string
  units?: number
  kgPerUnit?: string
  make?: string
  rate?: string
  gstPercent?: string
  amount?: string
}

/** purchase_orders + purchase_order_line_items (PHASE_MAP.md §7) — standalone, farm inputs only (Business_Rules, CLAUDE.md §8). */
export interface PurchaseOrder extends Timestamped {
  id: EntityId
  poNumber: string
  poDate?: string
  paymentTerms?: string
  supplierRef?: string
  otherRefs?: string
  dispatchThrough: string
  destination?: string
  supplierName: string
  supplierAddress?: string
  supplierEmail?: string
  supplierGst?: string
  lineItems: PurchaseOrderLineItem[]
  assessableValue?: string
  cgstTotal?: string
  sgstTotal?: string
  freight?: string
  otherCharges: string
  grandTotal?: string
  totalInWords?: string
  status: PurchaseOrderStatus
  createdBy: EntityId
}

export interface PurchaseOrderLineItemInput {
  particulars: string
  hsnCode?: string
  qtyKg: number
  units: number
  kgPerUnit: number
  make?: string
  rate: number
  gstPercent: number
}

export interface CreatePurchaseOrderInput {
  poDate: string
  paymentTerms?: string
  supplierRef?: string
  otherRefs?: string
  dispatchThrough: string
  destination?: string
  supplierName: string
  supplierAddress?: string
  supplierEmail?: string
  supplierGst?: string
  lineItems: PurchaseOrderLineItemInput[]
  freight?: string
  otherCharges: number
}

export interface SupplierSuggestion {
  name: string
  address: string
  gst?: string
}
