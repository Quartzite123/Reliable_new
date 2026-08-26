import { z } from 'zod'

export const companySettingsSchema = z.object({
  companyName: z.string().min(1, 'Enter the company name.'),
  companyAddress: z.string().min(1, 'Enter the company address.'),
  companyPhone: z.string().min(1, 'Enter a contact phone number.'),
  companyGstNumber: z.string().min(1, 'Enter the company GST number.'),
  companyEmail: z.string().min(1, 'Enter a contact email.').email('Enter a valid email.'),
  ggnNumber: z.string().min(1, 'Enter the GGN number.'),
})
export type CompanySettingsFormValues = z.infer<typeof companySettingsSchema>
