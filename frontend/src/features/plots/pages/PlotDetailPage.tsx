import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useParams } from 'react-router-dom'
import type { EntityId } from '@/types/common'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionCard } from '@/components/layout/SectionCard'
import { ReadOnlyReferenceCard } from '@/components/workflow/ReadOnlyReferenceCard'
import { WorkflowStepper } from '@/components/workflow/WorkflowStepper'
import { StatusBadge } from '@/components/workflow/StatusBadge'
import { Alert } from '@/components/feedback/Alert'
import { LoadingState } from '@/components/data/LoadingState'
import { ErrorState } from '@/components/data/ErrorState'
import { FormField } from '@/components/forms/FormField'
import { NumberInput } from '@/components/forms/NumberInput'
import { DatePicker } from '@/components/forms/DatePicker'
import { RadioGroup } from '@/components/forms/RadioGroup'
import { Textarea } from '@/components/forms/Textarea'
import { ValidationSummary } from '@/components/feedback/ValidationSummary'
import { useToast } from '@/app/ToastContext'
import { toFriendlyMessage } from '@/utils/errorMessages'
import { usePermission } from '@/permissions/usePermission'
import { seasonStatusToBadgeStatus } from '@/types/season'
import { buildWorkflowSteps } from '@/utils/workflowSteps'
import { usePlotDetail, useSubmitFollowUpFieldQc } from '../hooks'
import { followUpFieldQcSchema, type FollowUpFieldQcFormValues } from '../schema'

export function PlotDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading, error, refetch } = usePlotDetail(id ? Number(id) : undefined)
  const canCreateFieldQc = usePermission('fieldQc:create')
  const [followUpFor, setFollowUpFor] = useState<EntityId | null>(null)

  if (isLoading) return <LoadingState rows={5} />
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />
  if (!data) return null

  const { plot, registrations, fieldQcByRegistration } = data
  const latest = registrations[0]

  return (
    <>
      <PageHeader
        title={`${plot.plotNumber} — ${plot.variety}`}
        description={`MH Registration Number ${plot.mhRegistrationNumber} · ${plot.village}, ${plot.taluka}`}
      />

      <SectionCard title="Plot details">
        <ReadOnlyReferenceCard
          title="Plot"
          fields={[
            { label: 'Survey/Gat No.', value: plot.surveyNo ?? '—' },
            { label: 'Area', value: `${plot.areaAcres ?? '—'} acres` },
            { label: 'Pruning date', value: plot.pruningDate ?? '—' },
            { label: 'Expected harvest', value: plot.approxHarvestDate ?? '—' },
            {
              label: 'GPS',
              value: plot.gpsLat && plot.gpsLong ? `${Number(plot.gpsLat).toFixed(5)}, ${Number(plot.gpsLong).toFixed(5)}` : '—',
            },
          ]}
        />
      </SectionCard>

      {latest && (
        <SectionCard title={`Season ${latest.seasonYear}`}>
          <div className="mb-3 flex items-center gap-3">
            <StatusBadge status={seasonStatusToBadgeStatus(latest.status)} />
          </div>
          <WorkflowStepper steps={buildWorkflowSteps(latest.status)} />
        </SectionCard>
      )}

      {registrations.map((registration) => {
        const qcHistory = fieldQcByRegistration[registration.id] ?? []
        const failed = registration.status === 'Field QC Failed'

        return (
          <SectionCard key={registration.id} title={`Field QC — Season ${registration.seasonYear}`}>
            <div className="flex flex-col gap-3">
              {qcHistory.map((qc) => (
                <div key={qc.id} className="rounded-lg border border-gray-200 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-800">Inspected {qc.inspectionDate}</p>
                    <StatusBadge status={qc.result === 'Pass' ? 'passed' : 'failed'} />
                  </div>
                  <p className="mt-1 text-sm text-gray-600">
                    Exportable fruit: {qc.exportableFruitPercent}% · Overall: {qc.overallObservation}
                  </p>
                </div>
              ))}
            </div>

            {failed && (
              <div className="mt-3">
                <Alert variant="error" title="Field QC failed">
                  This is kept on record, not deleted. Log a new inspection visit to re-attempt.
                </Alert>
                {canCreateFieldQc && (
                  <button
                    type="button"
                    onClick={() => setFollowUpFor(followUpFor === registration.id ? null : registration.id)}
                    className="mt-2 text-sm font-medium text-brand-700 underline"
                  >
                    {followUpFor === registration.id ? 'Cancel follow-up' : 'Create follow-up / re-attempt'}
                  </button>
                )}
              </div>
            )}

            {followUpFor === registration.id && (
              <FollowUpFieldQcForm registrationId={registration.id} onDone={() => setFollowUpFor(null)} />
            )}
          </SectionCard>
        )
      })}
    </>
  )
}

function FollowUpFieldQcForm({ registrationId, onDone }: { registrationId: EntityId; onDone: () => void }) {
  const { showToast } = useToast()
  const submitFollowUp = useSubmitFollowUpFieldQc(registrationId)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FollowUpFieldQcFormValues>({ resolver: zodResolver(followUpFieldQcSchema) })

  const fruitColour = watch('fruitColour')
  const overallObservation = watch('overallObservation')
  const errorMessages = Object.values(errors)
    .map((e) => e?.message)
    .filter((m): m is string => !!m)

  const onSubmit = async (values: FollowUpFieldQcFormValues) => {
    try {
      await submitFollowUp.mutateAsync({ seasonRegistrationId: registrationId, ...values })
      showToast('Follow-up inspection recorded.', 'success')
      onDone()
    } catch (error) {
      showToast(toFriendlyMessage(error), 'error')
    }
  }

  return (
    <form className="mt-4 flex flex-col gap-4 rounded-lg border-2 border-dashed border-gray-300 p-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <ValidationSummary errors={errorMessages} />

      <FormField label="Inspection date" htmlFor="fu-inspectionDate" required error={errors.inspectionDate?.message}>
        <DatePicker id="fu-inspectionDate" hasError={!!errors.inspectionDate} {...register('inspectionDate')} />
      </FormField>

      <FormField label="Fruit colour" htmlFor="fu-fruitColour" required error={errors.fruitColour?.message}>
        <RadioGroup
          name="fu-fruitColour"
          value={fruitColour}
          onChange={(v) => setValue('fruitColour', v as FollowUpFieldQcFormValues['fruitColour'])}
          options={[
            { value: 'Green', label: 'Green' },
            { value: 'Milky Green', label: 'Milky Green' },
            { value: 'Yellow', label: 'Yellow' },
          ]}
        />
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="TSS percentage" htmlFor="fu-tssPercent" required error={errors.tssPercent?.message}>
          <NumberInput id="fu-tssPercent" unit="%" hasError={!!errors.tssPercent} {...register('tssPercent', { valueAsNumber: true })} />
        </FormField>
        <FormField label="Thrips mark percentage" htmlFor="fu-thripsPercent" required error={errors.thripsPercent?.message}>
          <NumberInput id="fu-thripsPercent" unit="%" hasError={!!errors.thripsPercent} {...register('thripsPercent', { valueAsNumber: true })} />
        </FormField>
        <FormField label="Bhuri percentage" htmlFor="fu-bhuriPercent" required error={errors.bhuriPercent?.message}>
          <NumberInput id="fu-bhuriPercent" unit="%" hasError={!!errors.bhuriPercent} {...register('bhuriPercent', { valueAsNumber: true })} />
        </FormField>
        <FormField label="Black spot percentage" htmlFor="fu-blackSpotPercent" required error={errors.blackSpotPercent?.message}>
          <NumberInput id="fu-blackSpotPercent" unit="%" hasError={!!errors.blackSpotPercent} {...register('blackSpotPercent', { valueAsNumber: true })} />
        </FormField>
        <FormField label="Cercospora/Kharda percentage" htmlFor="fu-cercosporaPercent" required error={errors.cercosporaPercent?.message}>
          <NumberInput id="fu-cercosporaPercent" unit="%" hasError={!!errors.cercosporaPercent} {...register('cercosporaPercent', { valueAsNumber: true })} />
        </FormField>
        <FormField label="Exportable fruit quantity" htmlFor="fu-exportableFruitPercent" required error={errors.exportableFruitPercent?.message}>
          <NumberInput id="fu-exportableFruitPercent" unit="%" hasError={!!errors.exportableFruitPercent} {...register('exportableFruitPercent', { valueAsNumber: true })} />
        </FormField>
      </div>

      <FormField label="Overall observation" htmlFor="fu-overallObservation" required error={errors.overallObservation?.message}>
        <RadioGroup
          name="fu-overallObservation"
          value={overallObservation}
          onChange={(v) => setValue('overallObservation', v as FollowUpFieldQcFormValues['overallObservation'])}
          options={[
            { value: 'Good', label: 'Good' },
            { value: 'Very Good', label: 'Very Good' },
            { value: 'Excellent', label: 'Excellent' },
          ]}
        />
      </FormField>

      <FormField label="Remarks" htmlFor="fu-notes">
        <Textarea id="fu-notes" {...register('notes')} />
      </FormField>

      <FormField label="Result" htmlFor="fu-result" required error={errors.result?.message}>
        <RadioGroup
          name="fu-result"
          value={watch('result')}
          onChange={(v) => setValue('result', v as FollowUpFieldQcFormValues['result'])}
          options={[
            { value: 'Pass', label: 'Pass' },
            { value: 'Fail', label: 'Fail' },
          ]}
        />
      </FormField>

      <button
        type="submit"
        disabled={isSubmitting}
        className="min-h-11 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
      >
        {isSubmitting ? 'Saving...' : 'Submit follow-up inspection'}
      </button>
    </form>
  )
}
