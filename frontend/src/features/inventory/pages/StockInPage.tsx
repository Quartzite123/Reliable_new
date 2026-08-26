import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionCard } from '@/components/layout/SectionCard'
import { FormField } from '@/components/forms/FormField'
import { TextInput } from '@/components/forms/TextInput'
import { NumberInput } from '@/components/forms/NumberInput'
import { Select } from '@/components/forms/Select'
import { DatePicker } from '@/components/forms/DatePicker'
import { useToast } from '@/app/ToastContext'
import { toFriendlyMessage } from '@/utils/errorMessages'
import { useMaterials } from '@/features/itemMaster/hooks'
import { useStockIn } from '../hooks'
import { stockInSchema, type StockInFormValues } from '../schema'

export function StockInPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [searchParams] = useSearchParams()
  const preselectedMaterialId = searchParams.get('materialId')
  const { data: entries } = useMaterials()
  const stockIn = useStockIn()

  const materials = (entries ?? []).filter((m) => m.isActive)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<StockInFormValues>({
    resolver: zodResolver(stockInSchema),
    defaultValues: preselectedMaterialId ? { materialId: Number(preselectedMaterialId) } : undefined,
  })

  const onSubmit = async (values: StockInFormValues) => {
    try {
      await stockIn.mutateAsync(values)
      showToast('Stock in recorded.', 'success')
      navigate('/inventory')
    } catch (error) {
      showToast(toFriendlyMessage(error), 'error')
    }
  }

  return (
    <>
      <PageHeader title="Stock In" />
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
            <FormField label="Quantity received" htmlFor="quantity" required error={errors.quantity?.message}>
              <NumberInput id="quantity" hasError={!!errors.quantity} {...register('quantity', { valueAsNumber: true })} />
            </FormField>
            <FormField label="Date" htmlFor="date" required error={errors.date?.message}>
              <DatePicker id="date" hasError={!!errors.date} {...register('date')} />
            </FormField>
            <FormField label="Supplier" htmlFor="supplierName" required error={errors.supplierName?.message}>
              <TextInput id="supplierName" hasError={!!errors.supplierName} {...register('supplierName')} />
            </FormField>
            <FormField label="Reference (invoice/challan no.)" htmlFor="reference">
              <TextInput id="reference" {...register('reference')} />
            </FormField>
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="min-h-12 rounded-lg bg-brand-700 text-base font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
          >
            {isSubmitting ? 'Saving...' : 'Record stock in'}
          </button>
        </form>
      </SectionCard>
    </>
  )
}
