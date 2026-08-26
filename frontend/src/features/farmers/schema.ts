import { z } from 'zod'

export const farmerSchema = z.object({
  name: z.string().min(1, 'Enter the farmer’s full name.'),
  address: z.string().min(1, 'Enter the farmer’s address.'),
  mobile: z
    .string()
    .min(1, 'Enter a mobile number.')
    .regex(/^\d{10}$/, 'Enter a valid 10-digit mobile number.'),
})
export type FarmerFormValues = z.infer<typeof farmerSchema>

export const bankDetailsSchema = z.object({
  accountHolderName: z.string().min(1, 'Enter the account holder name.'),
  bankName: z.string().min(1, 'Enter the bank name.'),
  accountNumber: z
    .string()
    .min(1, 'Enter the account number.')
    .regex(/^\d{9,18}$/, 'Enter a valid account number.'),
  ifscCode: z
    .string()
    .min(1, 'Enter the IFSC code.')
    .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Enter a valid IFSC code (e.g. SBIN0001234).'),
  branchName: z.string().optional(),
})
export type BankDetailsFormValues = z.infer<typeof bankDetailsSchema>
