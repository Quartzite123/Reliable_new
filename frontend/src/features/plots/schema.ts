import { z } from 'zod'
import { optionalDateField, percentageField, positiveNumberField, requiredDateField } from '@/schemas/common'
import { GRAPE_VARIETIES, type GrapeVariety } from './types'

const plotFieldsSchema = z.object({
  plotNumber: z.string().min(1, 'Enter the plot number.'),
  mhRegistrationNumber: z.string().min(1, 'Enter the MH Registration Number.'),
  variety: z.enum(GRAPE_VARIETIES as [GrapeVariety, ...GrapeVariety[]], { message: 'Select a variety.' }),
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
  seasonYear: z.number().int().min(2020).max(2100),
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

export const plotFieldQcSchema = plotFieldsSchema.merge(fieldQcFieldsSchema)
export type PlotFieldQcFormValues = z.infer<typeof plotFieldQcSchema>

export const followUpFieldQcSchema = fieldQcFieldsSchema.omit({ seasonYear: true })
export type FollowUpFieldQcFormValues = z.infer<typeof followUpFieldQcSchema>
