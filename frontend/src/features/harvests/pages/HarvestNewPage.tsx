import { zodResolver } from '@hookform/resolvers/zod'
import { useFieldArray, useForm } from 'react-hook-form'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionCard } from '@/components/layout/SectionCard'
import { EmptyState } from '@/components/data/EmptyState'
import { LoadingState } from '@/components/data/LoadingState'
import { FormField } from '@/components/forms/FormField'
import { TextInput } from '@/components/forms/TextInput'
import { NumberInput } from '@/components/forms/NumberInput'
import { DatePicker } from '@/components/forms/DatePicker'
import { ValidationSummary } from '@/components/feedback/ValidationSummary'
import { useToast } from '@/app/ToastContext'
import { toFriendlyMessage } from '@/utils/errorMessages'
import type { EntityId } from '@/types/common'
import { useCreateHarvest, useEligiblePlotsForHarvest } from '../hooks'
import { harvestSchema, type HarvestFormValues } from '../schema'

export function HarvestNewPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const seasonRegistrationIdParam = searchParams.get('seasonRegistrationId')
  const seasonRegistrationId = seasonRegistrationIdParam ? Number(seasonRegistrationIdParam) : undefined

  if (seasonRegistrationId === undefined) {
    return <EligiblePlotPicker onPick={(id) => setSearchParams({ seasonRegistrationId: String(id) })} />
  }

  return <HarvestForm seasonRegistrationId={seasonRegistrationId} onCreated={(id) => navigate(`/harvests/${id}`)} />
}

function EligiblePlotPicker({ onPick }: { onPick: (seasonRegistrationId: EntityId) => void }) {
  const { data, isLoading } = useEligiblePlotsForHarvest()

  return (
    <>
      <PageHeader title="Record Harvest" description="Only plots under contract are shown." />
      {isLoading && <LoadingState rows={3} />}
      {!isLoading && (data?.length ?? 0) === 0 && (
        <EmptyState title="No plots are ready for harvest" description="A plot must have a signed Contract first." />
      )}
      {!isLoading && data && data.length > 0 && (
        <ul className="flex flex-col gap-2">
          {data.map((row) => (
            <li key={row.seasonRegistrationId}>
              <button
                type="button"
                onClick={() => onPick(row.seasonRegistrationId)}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left hover:border-brand-400 hover:bg-brand-50"
              >
                <div>
                  <p className="font-semibold text-gray-900">{row.farmerName}</p>
                  <p className="text-sm text-gray-500">
                    {row.plotNumber} — {row.variety} · Season {row.seasonYear}
                  </p>
                </div>
                <span className="text-sm font-semibold text-brand-700">Record harvest</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

function HarvestForm({ seasonRegistrationId, onCreated }: { seasonRegistrationId: EntityId; onCreated: (id: EntityId) => void }) {
  const { showToast } = useToast()
  const createHarvest = useCreateHarvest()

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<HarvestFormValues>({
    resolver: zodResolver(harvestSchema),
    defaultValues: { trips: [{ vehicleNo: '', driverName: '', numCrates: undefined, approxWeightKg: undefined }] },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'trips' })

  const errorMessages = [
    ...Object.values(errors)
      .map((e) => (e && 'message' in e ? e.message : undefined))
      .filter((m): m is string => typeof m === 'string'),
    ...(errors.trips?.root?.message ? [errors.trips.root.message] : []),
  ]

  const onSubmit = async (values: HarvestFormValues) => {
    try {
      const harvest = await createHarvest.mutateAsync({ seasonRegistrationId, ...values })
      showToast('Harvest recorded.', 'success')
      onCreated(harvest.id)
    } catch (error) {
      showToast(toFriendlyMessage(error), 'error')
    }
  }

  return (
    <>
      <PageHeader title="Record Harvest" description="One picking, one or more truck trips." />

      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <ValidationSummary errors={errorMessages} />

        <SectionCard title="Harvest details">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Harvest date" htmlFor="harvestDate" required error={errors.harvestDate?.message}>
              <DatePicker id="harvestDate" hasError={!!errors.harvestDate} {...register('harvestDate')} />
            </FormField>
            <FormField label="Supervisor name" htmlFor="supervisorName" required error={errors.supervisorName?.message}>
              <TextInput id="supervisorName" hasError={!!errors.supervisorName} {...register('supervisorName')} />
            </FormField>
            <FormField label="Supervisor contact" htmlFor="supervisorContact">
              <TextInput id="supervisorContact" {...register('supervisorContact')} />
            </FormField>
          </div>
        </SectionCard>

        <SectionCard title="Vehicle trips" description="Add one row per truck.">
          <div className="flex flex-col gap-4">
            {fields.map((field, index) => (
              <div key={field.id} className="rounded-lg border border-gray-200 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-700">Trip {index + 1}</p>
                  {fields.length > 1 && (
                    <button type="button" onClick={() => remove(index)} className="text-sm font-medium text-red-600 underline">
                      Remove
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <FormField label="Vehicle number" htmlFor={`trips.${index}.vehicleNo`} required error={errors.trips?.[index]?.vehicleNo?.message}>
                    <TextInput id={`trips.${index}.vehicleNo`} hasError={!!errors.trips?.[index]?.vehicleNo} {...register(`trips.${index}.vehicleNo`)} />
                  </FormField>
                  <FormField label="Driver name" htmlFor={`trips.${index}.driverName`} required error={errors.trips?.[index]?.driverName?.message}>
                    <TextInput id={`trips.${index}.driverName`} hasError={!!errors.trips?.[index]?.driverName} {...register(`trips.${index}.driverName`)} />
                  </FormField>
                  <FormField label="Number of crates" htmlFor={`trips.${index}.numCrates`} required error={errors.trips?.[index]?.numCrates?.message}>
                    <NumberInput
                      id={`trips.${index}.numCrates`}
                      hasError={!!errors.trips?.[index]?.numCrates}
                      {...register(`trips.${index}.numCrates`, { valueAsNumber: true })}
                    />
                  </FormField>
                  <FormField label="Estimated weight" htmlFor={`trips.${index}.approxWeightKg`} required error={errors.trips?.[index]?.approxWeightKg?.message}>
                    <NumberInput
                      id={`trips.${index}.approxWeightKg`}
                      unit="kg"
                      hasError={!!errors.trips?.[index]?.approxWeightKg}
                      {...register(`trips.${index}.approxWeightKg`, { valueAsNumber: true })}
                    />
                  </FormField>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => append({ vehicleNo: '', driverName: '', numCrates: undefined as unknown as number, approxWeightKg: undefined as unknown as number })}
            className="mt-3 min-h-11 rounded-lg border-2 border-brand-700 px-4 py-2 text-sm font-semibold text-brand-800 hover:bg-brand-50"
          >
            + Add another vehicle trip
          </button>
        </SectionCard>

        <button
          type="submit"
          disabled={isSubmitting}
          className="min-h-12 rounded-lg bg-brand-700 text-base font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
        >
          {isSubmitting ? 'Saving...' : 'Save harvest'}
        </button>
      </form>
    </>
  )
}
