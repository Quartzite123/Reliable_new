import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionCard } from '@/components/layout/SectionCard'
import { StatusBadge } from '@/components/workflow/StatusBadge'
import { Alert } from '@/components/feedback/Alert'
import { LoadingState } from '@/components/data/LoadingState'
import { ErrorState } from '@/components/data/ErrorState'
import { useToast } from '@/app/ToastContext'
import { toFriendlyMessage } from '@/utils/errorMessages'
import { usePermission } from '@/permissions/usePermission'
import type { EntityId } from '@/types/common'
import { useArrivalQcByHarvest, useCreateArrivalQc } from '../hooks'
import { ArrivalQcForm } from '../components/ArrivalQcForm'
import { arrivalQcSchema, type ArrivalQcFormValues } from '../schema'

export function ArrivalQcDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading, error, refetch } = useArrivalQcByHarvest(id ? Number(id) : undefined)
  const canCreate = usePermission('arrivalQc:create')
  const [showFollowUp, setShowFollowUp] = useState(false)

  if (isLoading) return <LoadingState rows={4} />
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />
  if (!data) return null

  const { farmerName, plotNumber, harvestDate, history, harvestId } = data
  const latest = history[history.length - 1]
  const failed = latest?.result === 'Fail'

  return (
    <>
      <PageHeader title={`Arrival QC — ${farmerName}`} description={`${plotNumber} · Harvested ${harvestDate}`} />

      <SectionCard title="Inspection history">
        <div className="flex flex-col gap-3">
          {history.length === 0 && <p className="text-sm text-gray-500">No inspections yet.</p>}
          {history.map((record) => (
            <div key={record.id} className="rounded-lg border border-gray-200 p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-800">Inspected {record.inspectionDate}</p>
                <StatusBadge status={record.result === 'Pass' ? 'passed' : 'failed'} />
              </div>
              <p className="mt-1 text-sm text-gray-600">Overall: {record.overallObservation}</p>
            </div>
          ))}
        </div>

        {failed && (
          <div className="mt-3">
            <Alert variant="error" title="Arrival QC failed">
              This is kept on record, not deleted. Log a new inspection to re-attempt.
            </Alert>
            {canCreate && (
              <button
                type="button"
                onClick={() => setShowFollowUp((v) => !v)}
                className="mt-2 text-sm font-medium text-brand-700 underline"
              >
                {showFollowUp ? 'Cancel follow-up' : 'Create follow-up / re-attempt'}
              </button>
            )}
          </div>
        )}

        {showFollowUp && <FollowUpForm harvestId={harvestId} onDone={() => setShowFollowUp(false)} />}
      </SectionCard>
    </>
  )
}

function FollowUpForm({ harvestId, onDone }: { harvestId: EntityId; onDone: () => void }) {
  const { showToast } = useToast()
  const createArrivalQc = useCreateArrivalQc()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ArrivalQcFormValues>({ resolver: zodResolver(arrivalQcSchema) })

  const onSubmit = async (values: ArrivalQcFormValues) => {
    try {
      await createArrivalQc.mutateAsync({ harvestId, ...values })
      showToast('Follow-up inspection recorded.', 'success')
      onDone()
    } catch (error) {
      showToast(toFriendlyMessage(error), 'error')
    }
  }

  return (
    <div className="mt-4 rounded-lg border-2 border-dashed border-gray-300 p-4">
      <ArrivalQcForm register={register} errors={errors} watch={watch} setValue={setValue} idPrefix="fu-" />
      <button
        type="button"
        onClick={handleSubmit(onSubmit)}
        disabled={isSubmitting}
        className="mt-4 min-h-11 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
      >
        {isSubmitting ? 'Saving...' : 'Submit follow-up inspection'}
      </button>
    </div>
  )
}
