import { z } from 'zod'
import { percentageField, requiredDateField } from '@/schemas/common'

export const weighingSchema = z.object({
  date: requiredDateField('the weighing date'),
  slipSerialNo: z.string().optional(),
  slipNo: z.string().optional(),
  loadId: z.string().optional(),
  harvesterNo: z.string().optional(),
  noCrtReci: z.string().optional(),
  knitting: z.string().optional(),
  produceType: z.string().min(1, 'Select a produce type.'),
  averageSize: z.string().optional(),
  // Registered with `setValueAs` (not `valueAsNumber`) on the input — see
  // WeighingNewPage.tsx — so an empty field resolves to undefined here
  // instead of NaN, which `.optional()` alone would reject.
  averageSugar: z.number().positive('Average sugar must be greater than 0.').optional(),
  villageName: z.string().optional(),
  contactNo: z.string().optional(),
  supervisorName: z.string().min(1, 'Enter the supervisor name.'),
  crateCountAtWeighing: z
    .number({ message: 'Enter the crate count.' })
    .int('Crate count must be a whole number.')
    .positive('Crate count must be greater than 0.'),
  grossWeightKg: z.number({ message: 'Enter the gross weight.' }).positive('Gross weight must be greater than 0.'),
  actualRejectionPct: percentageField('actual rejection'),
})
export type WeighingFormValues = z.infer<typeof weighingSchema>
