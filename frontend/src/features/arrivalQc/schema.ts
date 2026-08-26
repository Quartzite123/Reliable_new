import { z } from 'zod'
import { percentageField, requiredDateField } from '@/schemas/common'

export const arrivalQcSchema = z.object({
  inspectionDate: requiredDateField('the inspection date'),
  fruitColourGreenPct: percentageField('Green fruit colour'),
  fruitColourMilkyPct: percentageField('Milky Green fruit colour'),
  fruitColourYellowPct: percentageField('Yellow fruit colour'),
  tssPercent: percentageField('TSS'),
  thripsPercent: percentageField('Thrips mark'),
  bhuriPercent: percentageField('Bhuri'),
  blackSpotPercent: percentageField('Black spot'),
  cercosporaPercent: percentageField('Cercospora/Kharda'),
  overallObservation: z.enum(['Good', 'Very Good', 'Excellent'], { message: 'Select an overall observation.' }),
  result: z.enum(['Pass', 'Fail'], { message: 'Select a result.' }),
  notes: z.string().optional(),
})
export type ArrivalQcFormValues = z.infer<typeof arrivalQcSchema>
