import { z } from 'zod'
import { requiredDateField } from '@/schemas/common'

export const contractSchema = z.object({
  contractDate: requiredDateField('the contract date'),
  ratePerKg: z.number({ message: 'Enter a valid rate per kg.' }).positive('Rate per kg must be greater than 0.'),
  rejectionPercent: z
    .number({ message: 'Enter a valid rejection percentage.' })
    .min(0, 'Rejection percentage cannot be below 0%.')
    .max(100, 'Rejection percentage cannot be above 100%.'),
  terms: z.string().optional(),
  notes: z.string().optional(),
})
export type ContractFormValues = z.infer<typeof contractSchema>

/** Company-wide default, editable per contract — Business_Rules R24. Never used directly in weighing/packaging math. */
export const DEFAULT_REJECTION_PERCENT = 7
