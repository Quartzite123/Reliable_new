import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionCard } from '@/components/layout/SectionCard'
import { FormField } from '@/components/forms/FormField'
import { TextInput } from '@/components/forms/TextInput'
import { NumberInput } from '@/components/forms/NumberInput'
import { Select } from '@/components/forms/Select'
import { useToast } from '@/app/ToastContext'
import { toFriendlyMessage } from '@/utils/errorMessages'
import { useCreateMaterial } from '../hooks'
import { materialSchema, type MaterialFormValues } from '../schema'
import { MATERIAL_TYPES, UNITS_OF_MEASURE } from '../types'

export function MaterialNewPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const createMaterial = useCreateMaterial()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<MaterialFormValues>({
    resolver: zodResolver(materialSchema),
    defaultValues: { isActive: true, scaleLevel: 'per_box' },
  })

  const onSubmit = async (values: MaterialFormValues) => {
    try {
      await createMaterial.mutateAsync(values)
      showToast('Material saved.', 'success')
      navigate('/inventory/materials')
    } catch (error) {
      showToast(toFriendlyMessage(error), 'error')
    }
  }

  return (
    <>
      <PageHeader title="New Material" />
      <SectionCard title="Packing material details">
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Material type" htmlFor="materialType" required error={errors.materialType?.message}>
              <Select
                id="materialType"
                hasError={!!errors.materialType}
                options={MATERIAL_TYPES.map((t) => ({ value: t, label: t }))}
                placeholder="Select type"
                {...register('materialType')}
              />
            </FormField>
            <FormField label="Variant name" htmlFor="variantName" required error={errors.variantName?.message}>
              <TextInput id="variantName" hasError={!!errors.variantName} {...register('variantName')} />
            </FormField>
            <FormField label="Unit" htmlFor="unitOfMeasure" required error={errors.unitOfMeasure?.message}>
              <Select
                id="unitOfMeasure"
                hasError={!!errors.unitOfMeasure}
                options={UNITS_OF_MEASURE.map((u) => ({ value: u, label: u }))}
                placeholder="Select unit"
                {...register('unitOfMeasure')}
              />
            </FormField>
            <FormField label="Reorder threshold" htmlFor="reorderPoint" required error={errors.reorderPoint?.message}>
              <NumberInput id="reorderPoint" hasError={!!errors.reorderPoint} {...register('reorderPoint', { valueAsNumber: true })} />
            </FormField>
          </div>

          <FormField label="Scale" htmlFor="scaleLevel" required error={errors.scaleLevel?.message}>
            <Select
              id="scaleLevel"
              hasError={!!errors.scaleLevel}
              options={[
                { value: 'per_box', label: 'Per box' },
                { value: 'per_container', label: 'Per container' },
              ]}
              {...register('scaleLevel')}
            />
          </FormField>

          <button
            type="submit"
            disabled={isSubmitting}
            className="min-h-12 rounded-lg bg-brand-700 text-base font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
          >
            {isSubmitting ? 'Saving...' : 'Save material'}
          </button>
        </form>
      </SectionCard>
    </>
  )
}
