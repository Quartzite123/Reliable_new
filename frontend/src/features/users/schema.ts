import { z } from 'zod'
import type { PhaseKey, Role } from '@/types/common'
import { ALL_PHASES } from './phaseLabels'

const ROLES: Role[] = ['admin', 'field_worker', 'lab_worker', 'office_worker', 'stock_manager', 'packaging_supervisor']

const phasesField = z
  .array(z.enum(ALL_PHASES as [PhaseKey, ...PhaseKey[]]))
  .min(1, 'At least one phase must be selected')

const mobileField = z.string().min(5, 'Enter a valid mobile number.').max(20, 'Mobile number is too long.')

export const createUserSchema = z.object({
  name: z.string().min(1, 'Enter the full name.'),
  mobile: mobileField,
  email: z.string().min(1, 'Enter an email address.').email('Enter a valid email address.'),
  role: z.enum(ROLES as [Role, ...Role[]], { message: 'Select a role.' }),
  phases: phasesField,
  temporaryPassword: z.string().min(12, 'Temporary password must be at least 12 characters.'),
})
export type CreateUserFormValues = z.infer<typeof createUserSchema>

/**
 * Full edit — everything about a user is editable here, including their
 * own password (admin-set, permanent — no forced change at next login,
 * 2026-09-01 admin user-management overhaul). Password is optional: an
 * empty field means "leave unchanged," so it isn't a plain min(12) — a
 * blank submission must pass validation too.
 */
export const updateUserSchema = z.object({
  name: z.string().min(1, 'Enter the full name.'),
  mobile: mobileField,
  email: z.string().min(1, 'Enter an email address.').email('Enter a valid email address.'),
  password: z.union([z.literal(''), z.string().min(12, 'Password must be at least 12 characters.')]),
  phases: phasesField,
})
export type UpdateUserFormValues = z.infer<typeof updateUserSchema>
