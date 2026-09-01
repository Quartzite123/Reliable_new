import { z } from 'zod'
import { requiredDateField } from '@/schemas/common'

// Rejection percentage is no longer a contract field — it's a fixed 7%
// company-wide (founder-confirmed, not negotiated), applied server-side
// in weighing/packaging from app/core/constants.py. Business_Rules R24/R28
// (rewritten). The contracts.rejection_percent DB column still exists
// (always defaults to 7.00) but nothing reads it anymore.
export const contractSchema = z.object({
  contractDate: requiredDateField('the contract date'),
  ratePerKg: z.number({ message: 'Enter a valid rate per kg.' }).positive('Rate per kg must be greater than 0.'),
  terms: z.string().optional(),
  notes: z.string().optional(),
})
export type ContractFormValues = z.infer<typeof contractSchema>
