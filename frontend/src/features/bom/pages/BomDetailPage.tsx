import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionCard } from '@/components/layout/SectionCard'
import { FormField } from '@/components/forms/FormField'
import { NumberInput } from '@/components/forms/NumberInput'
import { LoadingState } from '@/components/data/LoadingState'
import { ErrorState } from '@/components/data/ErrorState'
import { useToast } from '@/app/ToastContext'
import { toFriendlyMessage } from '@/utils/errorMessages'
import { usePermission } from '@/permissions/usePermission'
import { useBomEntry, useUpdateBomEntry } from '../hooks'

const editSchema = z.object({
  qtyPerContainer: z.number({ message: 'Enter a valid quantity per container.' }).int().positive('Quantity per container must be greater than 0.'),
  qtyPerBox: z.number({ message: 'Enter a valid quantity per box.' }).min(0, 'Quantity per box cannot be negative.').optional(),
})
type EditFormValues = z.infer<typeof editSchema>

export function BomDetailPage() {
  const { id } = useParams<{ id: string }>()
  const numericId = id ? Number(id) : undefined
  const { data, isLoading, error, refetch } = useBomEntry(numericId)
  const canManage = usePermission('bom:manage')

  if (isLoading) return <LoadingState rows={3} />
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />
  if (!data || numericId === undefined) return null

  return <BomEntryForm id={numericId} canManage={canManage} />
}

function BomEntryForm({ id, canManage }: { id: number; canManage: boolean }) {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { data } = useBomEntry(id)
  const updateBomEntry = useUpdateBomEntry(id)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditFormValues>({ resolver: zodResolver(editSchema) })

  useEffect(() => {
    if (data) {
      reset({
        qtyPerContainer: data.entry.qtyPerContainer,
        qtyPerBox: data.entry.qtyPerBox !== undefined ? Number(data.entry.qtyPerBox) : undefined,
      })
    }
  }, [data, reset])

  if (!data) return null

  const onSubmit = async (values: EditFormValues) => {
    try {
      await updateBomEntry.mutateAsync(values)
      showToast('BOM entry updated.', 'success')
    } catch (error) {
      showToast(toFriendlyMessage(error), 'error')
    }
  }

  return (
    <>
      <PageHeader
        title={`${data.variety} — ${data.packSize}`}
        description={`${data.customerName} · ${data.materialLabel}`}
        actions={
          <button
            type="button"
            onClick={() => navigate(`/inventory/bom?productId=${data.productId}`)}
            className="min-h-11 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Back to BOM
          </button>
        }
      />
      <SectionCard title="BOM entry">
        {canManage ? (
          <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Quantity per container" htmlFor="qtyPerContainer" required error={errors.qtyPerContainer?.message}>
                <NumberInput id="qtyPerContainer" hasError={!!errors.qtyPerContainer} {...register('qtyPerContainer', { valueAsNumber: true })} />
              </FormField>
              <FormField label="Quantity per box" htmlFor="qtyPerBox" error={errors.qtyPerBox?.message}>
                <NumberInput id="qtyPerBox" hasError={!!errors.qtyPerBox} {...register('qtyPerBox', { valueAsNumber: true })} />
              </FormField>
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-12 self-start rounded-lg bg-brand-700 px-6 text-base font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
            >
              {isSubmitting ? 'Saving...' : 'Save changes'}
            </button>
          </form>
        ) : (
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-gray-500">Quantity per container</dt>
              <dd className="text-sm font-medium text-gray-800">{data.entry.qtyPerContainer}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Quantity per box</dt>
              <dd className="text-sm font-medium text-gray-800">{data.entry.qtyPerBox ?? '—'}</dd>
            </div>
          </dl>
        )}
      </SectionCard>
    </>
  )
}
