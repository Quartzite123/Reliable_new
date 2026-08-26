import type { PurchaseOrder, SupplierSuggestion } from './types'

export const purchaseOrdersStore: PurchaseOrder[] = []

let nextPoId = 1
export function allocatePoId() {
  return nextPoId++
}
let nextLineItemId = 1
export function allocateLineItemId() {
  return nextLineItemId++
}

/** PHASE_MAP.md §7 example supplier — denormalized autocomplete data, not a full supplier master. */
export const suppliersStore: SupplierSuggestion[] = [
  { name: 'A.S. Joshi & Co.', address: 'Agro Chemical Distributors, Mumbai, Maharashtra', gst: '27AABCA1234B1Z8' },
]

/** `RF-PO<seq>/<season>-<season+1>` — season taken from the PO date's year, consistent with PHASE_MAP.md §7's format. */
export function mockGeneratePoNumber(poDate: string, sequence: number): string {
  const year = Number(poDate.slice(0, 4))
  const shortNext = String((year + 1) % 100).padStart(2, '0')
  return `RF-PO${String(sequence).padStart(2, '0')}/${year}-${shortNext}`
}
