import { z } from 'zod'
import { positiveNumberField, requiredDateField } from '@/schemas/common'
import { LABS, type Lab } from './types'

export const labSampleSchema = z.object({
  labName: z.enum(LABS as [Lab, ...Lab[]], { message: 'Select a lab.' }),
  samplingDate: requiredDateField('the sampling date'),
  sealNo: z.string().min(1, 'Enter the seal number.'),
  areaHa2a: positiveNumberField('area (2A)'),
  yield4bMt: positiveNumberField('yield (4B)'),
  tssValue: z.number({ message: 'Enter a valid TSS value.' }).min(0, 'TSS cannot be below 0.').max(40, 'Enter a realistic TSS value.'),
  remark: z.string().optional(),
  result: z.enum(['Pass', 'Fail'], { message: 'Select a result.' }),
})
export type LabSampleFormValues = z.infer<typeof labSampleSchema>
