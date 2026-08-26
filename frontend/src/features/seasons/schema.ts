import { z } from 'zod'

export const seasonFormSchema = z
  .object({
    year: z.number().int().min(2020).max(2100),
    startDate: z.string().min(1, 'Start date is required.'),
    endDate: z.string().min(1, 'End date is required.'),
    notes: z.string().optional(),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: 'End date must be after start date.',
    path: ['endDate'],
  })

export type SeasonFormValues = z.infer<typeof seasonFormSchema>
