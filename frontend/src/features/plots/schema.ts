import { z } from 'zod'
import { optionalDateField, percentageField, positiveNumberField, requiredDateField } from '@/schemas/common'
import { GRAPE_VARIETIES, type GrapeVariety } from './types'

/** Plot-level fields only — variety moved out to the repeatable varieties array (2026-09-03). */
const plotFieldsSchema = z.object({
  plotNumber: z.string().min(1, 'Enter the plot number.'),
  mhRegistrationNumber: z.string().min(1, 'Enter the MH Registration Number.'),
  areaAcres: positiveNumberField('area'),
  village: z.string().min(1, 'Enter the village.'),
  taluka: z.string().min(1, 'Enter the taluka.'),
  surveyNo: z.string().min(1, 'Enter the survey/gat number.'),
  gpsLat: z.number().optional(),
  gpsLong: z.number().optional(),
  pruningDate: optionalDateField,
  approxHarvestDate: optionalDateField,
})

const fieldQcFieldsSchema = z.object({
  inspectionDate: requiredDateField('the inspection date'),
  plannedSamplingDate: optionalDateField,
  tentativeHarvestDate: optionalDateField,
  fruitColour: z.enum(['Green', 'Milky Green', 'Yellow'], { message: 'Select the fruit colour.' }),
  tssPercent: percentageField('TSS'),
  thripsPercent: percentageField('Thrips mark'),
  bhuriPercent: percentageField('Bhuri'),
  blackSpotPercent: percentageField('Black spot'),
  cercosporaPercent: percentageField('Cercospora/Kharda'),
  overallObservation: z.enum(['Good', 'Very Good', 'Excellent'], { message: 'Select an overall observation.' }),
  exportableFruitPercent: percentageField('exportable fruit quantity'),
  notes: z.string().optional(),
  result: z.enum(['Pass', 'Fail'], { message: 'Select a result.' }),
})

export const followUpFieldQcSchema = fieldQcFieldsSchema
export type FollowUpFieldQcFormValues = z.infer<typeof followUpFieldQcSchema>

/**
 * One row of the repeatable varieties array — a variety, its own area
 * (optional, asked on every row including the single-variety case — no
 * silent fill from the plot's total; recording a number nobody entered
 * would assert something nobody said, reconsidered 2026-09-03), and its
 * own independent Field QC (R57).
 */
const varietyEntrySchema = z
  .object({
    variety: z.enum(GRAPE_VARIETIES as [GrapeVariety, ...GrapeVariety[]], { message: 'Select a variety.' }),
    areaAcres: z.number().positive('Enter a valid area.').optional(),
  })
  .merge(fieldQcFieldsSchema)
export type VarietyEntryFormValues = z.infer<typeof varietyEntrySchema>

/**
 * The combined Plot + Field QC screen (Business_Rules R15a), covering both
 * the common single-variety path and the rare multi-variety one with one
 * schema — `varieties` is always an array; the UI just shows one row
 * without add/remove controls when the "more than one variety" toggle is
 * off, instead of maintaining two parallel form shapes.
 */
export const plotMultiVarietyFieldQcSchema = plotFieldsSchema.extend({
  seasonYear: z.number().int().min(2020).max(2100),
  varieties: z.array(varietyEntrySchema).min(1, 'Add at least one variety.'),
})
export type PlotMultiVarietyFormValues = z.infer<typeof plotMultiVarietyFieldQcSchema>

/** A fresh, empty row for the varieties field array — deliberately not a full default so required fields still show validation errors until filled in. */
export const emptyVarietyEntry: Partial<VarietyEntryFormValues> = {}
