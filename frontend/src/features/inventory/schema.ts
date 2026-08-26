import { z } from 'zod'
import { requiredDateField } from '@/schemas/common'

export const stockInSchema = z.object({
  materialId: z.number({ message: 'Select a material.' }),
  quantity: z.number({ message: 'Enter a valid quantity.' }).positive('Quantity must be greater than 0.'),
  date: requiredDateField('the stock-in date'),
  supplierName: z.string().min(1, 'Enter the supplier name.'),
  reference: z.string().optional(),
})
export type StockInFormValues = z.infer<typeof stockInSchema>

export const adjustmentSchema = z.object({
  materialId: z.number({ message: 'Select a material.' }),
  quantity: z.number({ message: 'Enter a valid quantity.' }).refine((v) => v !== 0, 'Quantity cannot be zero.'),
  date: requiredDateField('the adjustment date'),
  reason: z.string().min(1, 'Enter a reason for this adjustment.'),
})
export type AdjustmentFormValues = z.infer<typeof adjustmentSchema>
