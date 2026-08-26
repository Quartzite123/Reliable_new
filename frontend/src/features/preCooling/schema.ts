import { z } from 'zod'
import { requiredDateField } from '@/schemas/common'

export const preCoolingInSchema = z.object({
  date: requiredDateField('the date'),
  inTime: z.string().min(1, 'Enter the in-time.'),
  inBerryTemp: z.number({ message: 'Enter a valid temperature.' }),
})
export type PreCoolingInFormValues = z.infer<typeof preCoolingInSchema>

export const preCoolingOutSchema = z.object({
  outTime: z.string().min(1, 'Enter the out-time.'),
  outBerryTemp: z.number({ message: 'Enter a valid temperature.' }),
})
export type PreCoolingOutFormValues = z.infer<typeof preCoolingOutSchema>
