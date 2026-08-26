import { z } from 'zod'

/** Shared zod primitives (prompt.md §22/§23) — reused across every feature form. */
export const percentageField = (label: string) =>
  z
    .number({ message: `Enter a valid percentage for ${label}.` })
    .min(0, `${label} cannot be below 0%.`)
    .max(100, `${label} cannot be above 100%.`)

export const requiredDateField = (label: string) => z.string().min(1, `Select ${label}.`)

export const optionalDateField = z.string().optional().or(z.literal(''))

export const positiveNumberField = (label: string) =>
  z.number({ message: `Enter a valid number for ${label}.` }).positive(`${label} must be greater than 0.`)
