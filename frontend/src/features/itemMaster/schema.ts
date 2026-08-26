import { z } from 'zod'
import { PACK_SIZES, COMPLIANCE_TYPES, type PackSize, type ComplianceType } from '@/features/packaging'
import { MATERIAL_TYPES, UNITS_OF_MEASURE, type MaterialType, type UnitOfMeasure } from './types'

export const materialSchema = z.object({
  materialType: z.enum(MATERIAL_TYPES as [MaterialType, ...MaterialType[]], {
    message: 'Select a material type.',
  }),
  variantName: z.string().min(1, 'Enter the variant name.'),
  unitOfMeasure: z.enum(UNITS_OF_MEASURE as [UnitOfMeasure, ...UnitOfMeasure[]], { message: 'Select a unit.' }),
  scaleLevel: z.enum(['per_box', 'per_container'], { message: 'Select per box or per container.' }),
  reorderPoint: z.number({ message: 'Enter a valid reorder threshold.' }).int().min(0, 'Reorder threshold cannot be negative.'),
  isActive: z.boolean(),
})
export type MaterialFormValues = z.infer<typeof materialSchema>

export const productSchema = z.object({
  variety: z.string().min(1, 'Select a variety.'),
  customerId: z.number({ message: 'Select a customer.' }),
  packSize: z.enum(PACK_SIZES as [PackSize, ...PackSize[]], { message: 'Select a pack size.' }),
  complianceType: z.enum(COMPLIANCE_TYPES as [ComplianceType, ...ComplianceType[]], { message: 'Select a compliance type.' }),
  isActive: z.boolean(),
})
export type ProductFormValues = z.infer<typeof productSchema>
