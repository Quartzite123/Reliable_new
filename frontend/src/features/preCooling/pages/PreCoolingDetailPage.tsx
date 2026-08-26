import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useParams } from 'react-router-dom'
import type { EntityId } from '@/types/common'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionCard } from '@/components/layout/SectionCard'
import { StatusBadge } from '@/components/workflow/StatusBadge'
import { FormField } from '@/components/forms/FormField'
import { NumberInput } from '@/components/forms/NumberInput'
import { TimePicker } from '@/components/forms/TimePicker'
import { LoadingState } from '@/components/data/LoadingState'
import { ErrorState } from '@/components/data/ErrorState'
import { useToast } from '@/app/ToastContext'
import { toFriendlyMessage } from '@/utils/errorMessages'
import { usePermission } from '@/permissions/usePermission'
import { useCompletePreCooling, usePreCoolingRecord } from '../hooks'
import { preCoolingOutSchema, type PreCoolingOutFormValues } from '../schema'

export function PreCoolingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const numericId = id ? Number(id) : undefined
  const { data, isLoading, error, refetch } = usePreCoolingRecord(numericId)
  const canComplete = usePermission('preCooling:create')

  if (isLoading) return <LoadingState rows={3} />
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />
  if (!data) return null

  const { record, palletLabel, isComplete } = data

  return (
    <>
      <PageHeader title="Pre-Cooling Entry" description={palletLabel} />

      <SectionCard title="Reading">
        <div className="mb-3">
          <StatusBadge status={isComplete ? 'completed' : 'in_progress'} />
        </div>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-gray-500">Date</dt>
            <dd className="text-sm font-medium text-gray-800">{record.date}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Pallets / Boxes</dt>
            <dd className="text-sm font-medium text-gray-800">
              {record.numPallets} / {record.numBoxes}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">In-time</dt>
            <dd className="text-sm font-medium text-gray-800">
              {record.inTime} · {record.inBerryTemp}°C
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Out-time</dt>
            <dd className="text-sm font-medium text-gray-800">
              {isComplete ? `${record.outTime} · ${record.outBerryTemp}°C` : 'Not recorded yet'}
            </dd>
          </div>
        </dl>
      </SectionCard>

      {!isComplete && canComplete && <CompleteForm recordId={record.id} />}
    </>
  )
}

function CompleteForm({ recordId }: { recordId: EntityId }) {
  const { showToast } = useToast()
  const completePreCooling = useCompletePreCooling(recordId)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PreCoolingOutFormValues>({ resolver: zodResolver(preCoolingOutSchema) })

  const onSubmit = async (values: PreCoolingOutFormValues) => {
    try {
      await completePreCooling.mutateAsync(values)
      showToast('Pre-cooling completed.', 'success')
    } catch (error) {
      showToast(toFriendlyMessage(error), 'error')
    }
  }

  return (
    <SectionCard title="Complete this entry">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Out-time" htmlFor="outTime" required error={errors.outTime?.message}>
            <TimePicker id="outTime" hasError={!!errors.outTime} {...register('outTime')} />
          </FormField>
          <FormField label="Out berry temperature" htmlFor="outBerryTemp" required error={errors.outBerryTemp?.message}>
            <NumberInput id="outBerryTemp" unit="°C" hasError={!!errors.outBerryTemp} {...register('outBerryTemp', { valueAsNumber: true })} />
          </FormField>
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="min-h-11 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
        >
          {isSubmitting ? 'Saving...' : 'Complete entry'}
        </button>
      </form>
    </SectionCard>
  )
}
