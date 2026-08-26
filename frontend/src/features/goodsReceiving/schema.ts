import { z } from 'zod'

export const goodsReceivingSchema = z.object({
  receivedCrates: z.number({ message: 'Enter a valid number of crates.' }).int().positive('Received crates must be greater than 0.'),
  receivedWeightKg: z.number({ message: 'Enter a valid weight.' }).positive('Received weight must be greater than 0.'),
  acceptedWeightKg: z.number({ message: 'Enter a valid weight.' }).min(0, 'Accepted weight cannot be negative.'),
  rejectedWeightKg: z.number({ message: 'Enter a valid weight.' }).min(0, 'Rejected weight cannot be negative.'),
  warehouseLocation: z.string().min(1, 'Enter the warehouse location.'),
  notes: z.string().optional(),
})
export type GoodsReceivingFormValues = z.infer<typeof goodsReceivingSchema>
