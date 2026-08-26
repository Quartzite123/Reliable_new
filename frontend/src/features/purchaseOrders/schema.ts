import { z } from 'zod'
import { requiredDateField } from '@/schemas/common'

export const lineItemSchema = z.object({
  particulars: z.string().min(1, 'Enter the item name.'),
  hsnCode: z.string().min(1, 'Enter the HSN code.'),
  qtyKg: z.number({ message: 'Enter a valid quantity.' }).positive('Quantity must be greater than 0.'),
  units: z.number({ message: 'Enter a valid number of units.' }).positive('Units must be greater than 0.'),
  kgPerUnit: z.number({ message: 'Enter a valid weight per unit.' }).positive('Kg per unit must be greater than 0.'),
  make: z.string().optional(),
  rate: z.number({ message: 'Enter a valid rate.' }).positive('Rate must be greater than 0.'),
  gstPercent: z.number({ message: 'Enter a valid GST percentage.' }).min(0).max(100),
})

export const purchaseOrderSchema = z.object({
  poDate: requiredDateField('the PO date'),
  paymentTerms: z.string().optional(),
  supplierRef: z.string().optional(),
  otherRefs: z.string().optional(),
  dispatchThrough: z.string().min(1, 'Enter the dispatch method.'),
  destination: z.string().optional(),
  supplierName: z.string().min(1, 'Enter the supplier name.'),
  supplierAddress: z.string().min(1, 'Enter the supplier address.'),
  supplierEmail: z.string().email('Enter a valid email.').optional().or(z.literal('')),
  supplierGst: z.string().optional(),
  lineItems: z.array(lineItemSchema).min(1, 'Add at least one line item.'),
  freight: z.string().min(1, 'Enter freight ("At Actual" or an amount).'),
  otherCharges: z.number({ message: 'Enter a valid amount.' }).min(0, 'Other charges cannot be negative.'),
})
export type PurchaseOrderFormValues = z.infer<typeof purchaseOrderSchema>
