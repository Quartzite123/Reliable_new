import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionCard } from '@/components/layout/SectionCard'
import { FormField } from '@/components/forms/FormField'
import { NumberInput } from '@/components/forms/NumberInput'
import { Select } from '@/components/forms/Select'
import { useToast } from '@/app/ToastContext'
import { toFriendlyMessage } from '@/utils/errorMessages'
import { useCustomers } from '@/features/customers/hooks'
import { useMaterials, useProducts } from '@/features/itemMaster/hooks'
import { useCreateBomEntry } from '../hooks'
import { bomEntrySchema, type BomEntryFormValues } from '../schema'

export function BomNewPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [searchParams] = useSearchParams()
  const preselectedProductId = searchParams.get('productId')
  const { data: products } = useProducts()
  const { data: materials } = useMaterials()
  const { data: customers } = useCustomers()
  const createBomEntry = useCreateBomEntry()

  const activeProducts = (products ?? []).filter((p) => p.isActive)
  const activeMaterials = (materials ?? []).filter((m) => m.isActive)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<BomEntryFormValues>({
    resolver: zodResolver(bomEntrySchema),
    defaultValues: preselectedProductId ? { productId: Number(preselectedProductId) } : undefined,
  })

  const onSubmit = async (values: BomEntryFormValues) => {
    try {
      await createBomEntry.mutateAsync(values)
      showToast('BOM entry saved.', 'success')
      navigate(`/inventory/bom?productId=${values.productId}`)
    } catch (error) {
      showToast(toFriendlyMessage(error), 'error')
    }
  }

  return (
    <>
      <PageHeader title="New BOM Entry" />
      <SectionCard>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <FormField label="Finished product" htmlFor="productId" required error={errors.productId?.message}>
            <Select
              id="productId"
              hasError={!!errors.productId}
              placeholder="Select product"
              options={activeProducts.map((p) => ({
                value: p.id,
                label: `${p.variety} — ${customers?.find((c) => c.id === p.customerId)?.name ?? '?'} — ${p.packSize} (${p.complianceType})`,
              }))}
              {...register('productId', { valueAsNumber: true })}
            />
          </FormField>

          <FormField label="Material" htmlFor="materialId" required error={errors.materialId?.message}>
            <Select
              id="materialId"
              hasError={!!errors.materialId}
              placeholder="Select material"
              options={activeMaterials.map((m) => ({
                value: m.id,
                label: `${m.materialType} — ${m.variantName} (${m.scaleLevel.replace('_', ' ')})`,
              }))}
              {...register('materialId', { valueAsNumber: true })}
            />
          </FormField>

          <FormField label="Quantity per container" htmlFor="qtyPerContainer" required error={errors.qtyPerContainer?.message}>
            <NumberInput id="qtyPerContainer" hasError={!!errors.qtyPerContainer} {...register('qtyPerContainer', { valueAsNumber: true })} />
          </FormField>

          <FormField
            label="Quantity per box"
            htmlFor="qtyPerBox"
            hint="Only needed for per-box materials — drives auto stock-out on Packaging."
            error={errors.qtyPerBox?.message}
          >
            <NumberInput id="qtyPerBox" hasError={!!errors.qtyPerBox} {...register('qtyPerBox', { valueAsNumber: true })} />
          </FormField>

          <button
            type="submit"
            disabled={isSubmitting}
            className="min-h-12 rounded-lg bg-brand-700 text-base font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
          >
            {isSubmitting ? 'Saving...' : 'Save BOM entry'}
          </button>
        </form>
      </SectionCard>
    </>
  )
}
