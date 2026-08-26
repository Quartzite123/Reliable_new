import { z } from 'zod'
import { positiveNumberField, requiredDateField } from '@/schemas/common'

export const vehicleTripSchema = z.object({
  vehicleNo: z.string().min(1, 'Enter the vehicle number.'),
  driverName: z.string().min(1, 'Enter the driver name.'),
  numCrates: z.number({ message: 'Enter a valid number of crates.' }).int().positive('Number of crates must be greater than 0.'),
  approxWeightKg: positiveNumberField('estimated weight'),
})
export type VehicleTripFormValues = z.infer<typeof vehicleTripSchema>

export const harvestSchema = z.object({
  harvestDate: requiredDateField('the harvest date'),
  supervisorName: z.string().min(1, 'Enter the supervisor name.'),
  supervisorContact: z.string().optional(),
  trips: z.array(vehicleTripSchema).min(1, 'Add at least one vehicle trip.'),
})
export type HarvestFormValues = z.infer<typeof harvestSchema>
