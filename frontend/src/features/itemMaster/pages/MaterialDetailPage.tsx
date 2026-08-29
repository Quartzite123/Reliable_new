import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionCard } from '@/components/layout/SectionCard'
import { FormField } from '@/components/forms/FormField'
import { TextInput } from '@/components/forms/TextInput'
import { NumberInput } from '@/components/forms/NumberInput'
import { Select } from '@/components/forms/Select'
import { CheckboxGroup } from '@/components/forms/CheckboxGroup'
import { DataTable, type DataTableColumn } from '@/components/data/DataTable'
import { LoadingState } from '@/components/data/LoadingState'
import { EmptyState } from '@/components/data/EmptyState'
import { ErrorState } from '@/components/data/ErrorState'
import { useToast } from '@/app/ToastContext'
import { toFriendlyMessage } from '@/utils/errorMessages'
import { useMaterialMovements } from '@/features/inventory/hooks'
import type { StockMovement } from '@/features/inventory/types'
import { useMaterials, useUpdateMaterial } from '../hooks'
import { materialSchema, type MaterialFormValues } from '../schema'
import { MATERIAL_TYPES, UNITS_OF_MEASURE } from '../types'

const MOVEMENT_LABELS: Record<string, string> = { in: 'Stock In', auto_out: 'Auto Deducted (Packaging)', adjustment: 'Adjustment' }

export function MaterialDetailPage() {
  const { id } = useParams<{ id: string }>()
  const numericId = id ? Number(id) : undefined
  const { data, isLoading, isError, error, refetch } = useMaterials()
  const material = data?.find((m) => m.id === numericId)

  if (isLoading) return <LoadingState rows={4} />
  if (isError) return <ErrorState error={error} onRetry={() => refetch()} />
  if (!material) return <EmptyState title="Material not found" />

  return <PackingMaterialDetail id={material.id} />
}

function PackingMaterialDetail({ id }: { id: number }) {
  const { showToast } = useToast()
  const { data } = useMaterials()
  const updateMaterial = useUpdateMaterial(id)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<MaterialFormValues>({ resolver: zodResolver(materialSchema) })

  useEffect(() => {
    const material = data?.find((m) => m.id === id)
    if (material) {
      reset({
        materialType: material.materialType,
        variantName: material.variantName,
        unitOfMeasure: material.unitOfMeasure,
        scaleLevel: material.scaleLevel,
        reorderPoint: material.reorderPoint ?? 0,
        isActive: material.isActive,
      })
    }
  }, [id, data, reset])

  const isActive = watch('isActive')

  const onSubmit = async (values: MaterialFormValues) => {
    try {
      await updateMaterial.mutateAsync(values)
      showToast('Material updated.', 'success')
    } catch (error) {
      showToast(toFriendlyMessage(error), 'error')
    }
  }

  return (
    <>
      <PageHeader title="Edit Packing Material" />
      <SectionCard>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Material type" htmlFor="materialType" required error={errors.materialType?.message}>
              <Select
                id="materialType"
                hasError={!!errors.materialType}
                options={MATERIAL_TYPES.map((t) => ({ value: t, label: t }))}
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
                {...register('unitOfMeasure')}
              />
            </FormField>
            <FormField label="Reorder threshold" htmlFor="reorderPoint" required error={errors.reorderPoint?.message}>
              <NumberInput id="reorderPoint" hasError={!!errors.reorderPoint} {...register('reorderPoint', { valueAsNumber: true })} />
            </FormField>
          </div>

          <FormField label="Status" htmlFor="isActive">
            <CheckboxGroup
              name="isActive"
              values={isActive ? ['active'] : []}
              onChange={(values) => setValue('isActive', values.includes('active'))}
              options={[{ value: 'active', label: 'Active (uncheck to deactivate — no hard deletes)' }]}
            />
          </FormField>

          <button
            type="submit"
            disabled={isSubmitting}
            className="min-h-12 rounded-lg bg-brand-700 text-base font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
          >
            {isSubmitting ? 'Saving...' : 'Save changes'}
          </button>
        </form>
      </SectionCard>

      <StockHistorySection materialId={id} />
    </>
  )
}

function StockHistorySection({ materialId }: { materialId: number }) {
  const { data, isLoading } = useMaterialMovements(materialId)

  const columns: DataTableColumn<StockMovement>[] = [
    { key: 'type', header: 'Type', render: (m) => MOVEMENT_LABELS[m.movementType], isPrimary: true },
    { key: 'quantity', header: 'Quantity', render: (m) => (m.quantity > 0 ? `+${m.quantity}` : m.quantity) },
    { key: 'date', header: 'Date', render: (m) => m.date ?? '—' },
    { key: 'reference', header: 'Reference / Reason', render: (m) => m.reference ?? m.reason ?? m.supplierName ?? '—' },
  ]

  return (
    <SectionCard title="Stock History" description="Last 20 movements for this material.">
      {isLoading && <LoadingState rows={3} />}
      {!isLoading && <DataTable columns={columns} rows={data ?? []} getRowId={(m) => m.id} emptyTitle="No movements recorded yet" />}
    </SectionCard>
  )
}
