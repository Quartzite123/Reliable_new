import { z } from 'zod'
import { requiredDateField } from '@/schemas/common'
import { PALLET_TYPES, type PalletType } from './types'

export const palletSchema = z.object({
  date: requiredDateField('the pallet date'),
  palletType: z.enum(PALLET_TYPES as [PalletType, ...PalletType[]], { message: 'Select a pallet type.' }),
  notes: z.string().optional(),
})
export type PalletFormValues = z.infer<typeof palletSchema>
