import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionCard } from '@/components/layout/SectionCard'
import { FormField } from '@/components/forms/FormField'
import { NumberInput } from '@/components/forms/NumberInput'
import { Select } from '@/components/forms/Select'
import { DatePicker } from '@/components/forms/DatePicker'
import { Textarea } from '@/components/forms/Textarea'
import { Alert } from '@/components/feedback/Alert'
import { useToast } from '@/app/ToastContext'
import { toFriendlyMessage } from '@/utils/errorMessages'
import { useMaterials } from '@/features/itemMaster/hooks'
import { useAdjustStock } from '../hooks'
import { adjustmentSchema, type AdjustmentFormValues } from '../schema'

/** Damaged-box/discrepancy corrections — the Inventory Manager's domain, not the packaging worker's (prompt.md §16). */
export function AdjustmentsPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [searchParams] = useSearchParams()
  const preselectedMaterialId = searchParams.get('materialId')
  const { data: entries } = useMaterials()
  const adjustStock = useAdjustStock()

  const materials = (entries ?? []).filter((m) => m.isActive)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AdjustmentFormValues>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: preselectedMaterialId ? { materialId: Number(preselectedMaterialId) } : undefined,
  })

  const onSubmit = async (values: AdjustmentFormValues) => {
    try {
      await adjustStock.mutateAsync(values)
      showToast('Adjustment recorded.', 'success')
      navigate('/inventory')
    } catch (error) {
      showToast(toFriendlyMessage(error), 'error')
    }
  }

  return (
    <>
      <PageHeader title="Manual Adjustment" />
      <Alert variant="info">Use a positive number for stock found, a negative number for damaged/lost stock.</Alert>
      <SectionCard>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <FormField label="Material" htmlFor="materialId" required error={errors.materialId?.message}>
            <Select
              id="materialId"
              hasError={!!errors.materialId}
              placeholder="Select material"
              options={materials.map((m) => ({ value: m.id, label: `${m.materialType} — ${m.variantName}` }))}
              {...register('materialId', { valueAsNumber: true })}
            />
          </FormField>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Quantity (+/-)" htmlFor="quantity" required error={errors.quantity?.message}>
              <NumberInput id="quantity" hasError={!!errors.quantity} {...register('quantity', { valueAsNumber: true })} />
            </FormField>
            <FormField label="Date" htmlFor="date" required error={errors.date?.message}>
              <DatePicker id="date" hasError={!!errors.date} {...register('date')} />
            </FormField>
          </div>
          <FormField label="Reason" htmlFor="reason" required error={errors.reason?.message}>
            <Textarea id="reason" hasError={!!errors.reason} {...register('reason')} />
          </FormField>
          <button
            type="submit"
            disabled={isSubmitting}
            className="min-h-12 rounded-lg bg-brand-700 text-base font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
          >
            {isSubmitting ? 'Saving...' : 'Record adjustment'}
          </button>
        </form>
      </SectionCard>
    </>
  )
}
