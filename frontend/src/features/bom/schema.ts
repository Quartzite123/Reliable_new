import { z } from 'zod'

export const bomEntrySchema = z.object({
  productId: z.number({ message: 'Select a finished product.' }),
  materialId: z.number({ message: 'Select a material.' }),
  qtyPerContainer: z.number({ message: 'Enter a valid quantity per container.' }).int().positive('Quantity per container must be greater than 0.'),
  qtyPerBox: z.number({ message: 'Enter a valid quantity per box.' }).min(0, 'Quantity per box cannot be negative.').optional(),
})
export type BomEntryFormValues = z.infer<typeof bomEntrySchema>
