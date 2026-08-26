import { z } from 'zod'
import type { PhaseKey, Role } from '@/types/common'
import { ALL_PHASES } from './phaseLabels'

const ROLES: Role[] = ['admin', 'field_worker', 'lab_worker', 'office_worker', 'stock_manager', 'packaging_supervisor']

const phasesField = z
  .array(z.enum(ALL_PHASES as [PhaseKey, ...PhaseKey[]]))
  .min(1, 'At least one phase must be selected')

export const createUserSchema = z.object({
  name: z.string().min(1, 'Enter the full name.'),
  email: z.string().min(1, 'Enter an email address.').email('Enter a valid email address.'),
  role: z.enum(ROLES as [Role, ...Role[]], { message: 'Select a role.' }),
  phases: phasesField,
  temporaryPassword: z.string().min(8, 'Temporary password must be at least 8 characters.'),
})
export type CreateUserFormValues = z.infer<typeof createUserSchema>

export const updateUserPhasesSchema = z.object({
  phases: phasesField,
})
export type UpdateUserPhasesFormValues = z.infer<typeof updateUserPhasesSchema>
