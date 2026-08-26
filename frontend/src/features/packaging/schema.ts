import { z } from 'zod'
import { requiredDateField } from '@/schemas/common'
import { COMPLIANCE_TYPES, type ComplianceType } from './comboSeed'

/**
 * customerId and packSize are deliberately NOT part of this schema — they're
 * driven by controlled selects with cascading, filtered options (see
 * PackagingNewPage) and validated manually before submit, since RHF's
 * `register` can't own a value that's also being derived from another
 * field's selection.
 */
export const packagingSchema = z.object({
  date: requiredDateField('the packing date'),
  slipNo: z.string().min(1, 'Enter the slip number.'),
  complianceType: z.enum(COMPLIANCE_TYPES as [ComplianceType, ...ComplianceType[]], { message: 'Select a compliance type.' }),
  totalWeightKg: z.number({ message: 'Enter a valid total weight.' }).positive('Total weight must be greater than 0.'),
  actualRejectionKg: z.number({ message: 'Enter a valid rejection weight.' }).min(0, 'Rejection weight cannot be negative.'),
  numBoxes: z.number({ message: 'Enter a valid number of boxes.' }).int().positive('Number of boxes must be greater than 0.'),
  numPallets: z.number({ message: 'Enter a valid number of pallets.' }).int().min(0, 'Number of pallets cannot be negative.'),
})
export type PackagingFormValues = z.infer<typeof packagingSchema>
