import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionCard } from '@/components/layout/SectionCard'
import { EmptyState } from '@/components/data/EmptyState'
import { ErrorState } from '@/components/data/ErrorState'
import { LoadingState } from '@/components/data/LoadingState'
import { ReadOnlyReferenceCard } from '@/components/workflow/ReadOnlyReferenceCard'
import { FormField } from '@/components/forms/FormField'
import { TextInput } from '@/components/forms/TextInput'
import { NumberInput } from '@/components/forms/NumberInput'
import { Select } from '@/components/forms/Select'
import { DatePicker } from '@/components/forms/DatePicker'
import { Textarea } from '@/components/forms/Textarea'
import { FileUpload } from '@/components/forms/FileUpload'
import { RadioGroup } from '@/components/forms/RadioGroup'
import { useState } from 'react'
import { useToast } from '@/app/ToastContext'
import { toFriendlyMessage } from '@/utils/errorMessages'
import type { EntityId } from '@/types/common'
import { useCreateLabSample, useEligiblePlotsForLab, useLabSampleReference } from '../hooks'
import { labSampleSchema, type LabSampleFormValues } from '../schema'
import { LABS } from '../types'

export function LabSampleNewPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const seasonRegistrationIdParam = searchParams.get('seasonRegistrationId')
  const seasonRegistrationId = seasonRegistrationIdParam ? Number(seasonRegistrationIdParam) : undefined

  if (seasonRegistrationId === undefined) {
    return <EligiblePlotPicker onPick={(id) => setSearchParams({ seasonRegistrationId: String(id) })} />
  }

  return <LabSampleForm seasonRegistrationId={seasonRegistrationId} onCreated={(id) => navigate(`/lab-samples/${id}`)} />
}

function EligiblePlotPicker({ onPick }: { onPick: (seasonRegistrationId: EntityId) => void }) {
  const { data, isLoading, isError, error, refetch } = useEligiblePlotsForLab()

  return (
    <>
      <PageHeader title="New Lab Sample" description="Only plots that passed Field QC are shown (Business_Rules R18)." />
      {isLoading && <LoadingState rows={3} />}
      {!isLoading && isError && <ErrorState error={error} onRetry={() => refetch()} />}
      {!isLoading && !isError && (data?.length ?? 0) === 0 && (
        <EmptyState title="No plots are ready for lab sampling" description="A plot must pass Field QC first." />
      )}
      {!isLoading && !isError && data && data.length > 0 && (
        <ul className="flex flex-col gap-2">
          {data.map((row) => (
            <li key={row.seasonRegistrationId}>
              <button
                type="button"
                onClick={() => onPick(row.seasonRegistrationId)}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left hover:border-brand-400 hover:bg-brand-50"
              >
                <div>
                  <p className="font-semibold text-gray-900">{row.reference.farmerName}</p>
                  <p className="text-sm text-gray-500">
                    {row.reference.plotNumber} — {row.reference.variety} · Season {row.reference.seasonYear}
                  </p>
                </div>
                <span className="text-sm font-semibold text-brand-700">Sample this plot</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

function LabSampleForm({
  seasonRegistrationId,
  onCreated,
}: {
  seasonRegistrationId: EntityId
  onCreated: (id: EntityId) => void
}) {
  const { showToast } = useToast()
  const { data: reference, isLoading, isError, error, refetch } = useLabSampleReference(seasonRegistrationId)
  const createLabSample = useCreateLabSample()
  const [varietyConfirmed, setVarietyConfirmed] = useState<string>('')
  const [sealPhoto, setSealPhoto] = useState<File | null>(null)
  const [documents2a4b, setDocuments2a4b] = useState<File | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LabSampleFormValues>({ resolver: zodResolver(labSampleSchema) })

  if (isLoading) return <LoadingState rows={4} />
  if (isError) return <ErrorState error={error} onRetry={() => refetch()} />
  if (!reference) return null

  const onSubmit = async (values: LabSampleFormValues) => {
    try {
      const sample = await createLabSample.mutateAsync({
        seasonRegistrationId,
        ...values,
        varietyConfirmed: varietyConfirmed || reference.variety || '',
        sealPhoto,
        documents2a4b,
      })
      showToast('Lab sample recorded.', 'success')
      onCreated(sample.id)
    } catch (error) {
      showToast(toFriendlyMessage(error), 'error')
    }
  }

  return (
    <>
      <PageHeader title="New Lab Sample" description={`${reference.farmerName} — ${reference.plotNumber}`} />

      <SectionCard title="Plot reference">
        <ReadOnlyReferenceCard
          title="From plot record"
          fields={[
            { label: 'Farmer', value: reference.farmerName },
            { label: 'MH Registration Number', value: reference.mhRegistrationNumber ?? '—' },
            { label: 'Variety', value: reference.variety ?? '—' },
            { label: 'Village/Taluka', value: `${reference.village ?? '—'}, ${reference.taluka ?? '—'}` },
            { label: 'Survey/Gat No.', value: reference.surveyNo ?? '—' },
            {
              label: 'GPS',
              value: reference.gpsLat && reference.gpsLong ? `${reference.gpsLat.toFixed(5)}, ${reference.gpsLong.toFixed(5)}` : '—',
            },
          ]}
        />
      </SectionCard>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <SectionCard title="Lab sample details">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Lab" htmlFor="labName" required error={errors.labName?.message}>
              <Select
                id="labName"
                hasError={!!errors.labName}
                options={LABS.map((l) => ({ value: l, label: l }))}
                placeholder="Select lab"
                {...register('labName')}
              />
            </FormField>
            <FormField label="Sampling date" htmlFor="samplingDate" required error={errors.samplingDate?.message}>
              <DatePicker id="samplingDate" hasError={!!errors.samplingDate} {...register('samplingDate')} />
            </FormField>
            <FormField label="Seal number" htmlFor="sealNo" required error={errors.sealNo?.message}>
              <TextInput id="sealNo" hasError={!!errors.sealNo} {...register('sealNo')} />
            </FormField>
            <FormField label="Variety confirmed by lab" htmlFor="varietyConfirmed">
              <TextInput
                id="varietyConfirmed"
                value={varietyConfirmed || reference.variety || ''}
                onChange={(e) => setVarietyConfirmed(e.target.value)}
              />
            </FormField>
            <FormField label="Area (2A)" htmlFor="areaHa2a" required error={errors.areaHa2a?.message}>
              <NumberInput id="areaHa2a" unit="ha" step="0.01" hasError={!!errors.areaHa2a} {...register('areaHa2a', { valueAsNumber: true })} />
            </FormField>
            <FormField label="Yield (4B)" htmlFor="yield4bMt" required error={errors.yield4bMt?.message}>
              <NumberInput id="yield4bMt" unit="MT" step="0.01" hasError={!!errors.yield4bMt} {...register('yield4bMt', { valueAsNumber: true })} />
            </FormField>
            <FormField label="MRL / TSS value" htmlFor="tssValue" required error={errors.tssValue?.message}>
              <NumberInput id="tssValue" hasError={!!errors.tssValue} {...register('tssValue', { valueAsNumber: true })} />
            </FormField>
          </div>

          <FormField label="Remarks" htmlFor="remark">
            <Textarea id="remark" {...register('remark')} />
          </FormField>
        </SectionCard>

        <SectionCard title="Documents">
          <div className="flex flex-col gap-4">
            <FormField label="Sampling seal photo" htmlFor="sealPhoto">
              <FileUpload id="sealPhoto" label="seal photo" accept="image/*" value={sealPhoto} onChange={setSealPhoto} />
            </FormField>
            <FormField label="2A / 4B document" htmlFor="documents2a4b">
              <FileUpload id="documents2a4b" label="2A/4B document" accept="application/pdf,image/*" value={documents2a4b} onChange={setDocuments2a4b} />
            </FormField>
          </div>
        </SectionCard>

        <SectionCard title="Result">
          <FormField label="Result" htmlFor="result" required error={errors.result?.message}>
            <RadioGroup
              name="result"
              value={watch('result')}
              onChange={(v) => setValue('result', v as LabSampleFormValues['result'])}
              options={[
                { value: 'Pass', label: 'Pass' },
                { value: 'Fail', label: 'Fail' },
              ]}
            />
          </FormField>
        </SectionCard>

        <button
          type="submit"
          disabled={isSubmitting}
          className="min-h-12 rounded-lg bg-brand-700 text-base font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
        >
          {isSubmitting ? 'Saving...' : 'Save lab sample'}
        </button>
      </form>
    </>
  )
}
