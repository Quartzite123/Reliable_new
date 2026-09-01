import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionCard } from '@/components/layout/SectionCard'
import { LoadingState } from '@/components/data/LoadingState'
import { ReadOnlyReferenceCard } from '@/components/workflow/ReadOnlyReferenceCard'
import { Alert } from '@/components/feedback/Alert'
import { ConfirmationDialog } from '@/components/feedback/ConfirmationDialog'
import { FormField } from '@/components/forms/FormField'
import { TextInput } from '@/components/forms/TextInput'
import { NumberInput } from '@/components/forms/NumberInput'
import { DatePicker } from '@/components/forms/DatePicker'
import { RadioGroup } from '@/components/forms/RadioGroup'
import { CameraCapture } from '@/components/forms/CameraCapture'
import { useCompanySettings } from '@/features/companySettings/hooks'
import { useToast } from '@/app/ToastContext'
import { toFriendlyMessage } from '@/utils/errorMessages'
import type { EntityId } from '@/types/common'
import { useCreateWeighing, useWeighingContext } from '../hooks'
import { weighingSchema, type WeighingFormValues } from '../schema'

const DEFAULT_CRATE_TARE_WEIGHT_KG = 1.6
// Fixed 7% deduction, founder-confirmed — not negotiated, not read from the
// contract, not compared against actual observed rejection. Mirrors backend
// app/core/constants.py FARMER_REJECTION_PCT. Business_Rules.md R28.
const FARMER_REJECTION_PCT = 7

export function WeighingNewPage() {
  const [searchParams] = useSearchParams()
  const vehicleTripIdParam = searchParams.get('vehicleTripId')
  const vehicleTripId = vehicleTripIdParam ? Number(vehicleTripIdParam) : undefined

  if (vehicleTripId === undefined) {
    return (
      <>
        <PageHeader title="Weighing" />
        <Alert variant="info">
          Start from <Link to="/vehicle-trips" className="font-semibold underline">Vehicle Trips</Link> and pick a
          trip that hasn't been weighed yet.
        </Alert>
      </>
    )
  }

  return <WeighingForm vehicleTripId={vehicleTripId} />
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function WeighingForm({ vehicleTripId }: { vehicleTripId: EntityId }) {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { data: context, isLoading, error } = useWeighingContext(vehicleTripId)
  const { data: companySettings } = useCompanySettings()
  const createWeighing = useCreateWeighing()
  const [slipPhoto, setSlipPhoto] = useState<File | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<WeighingFormValues>({
    resolver: zodResolver(weighingSchema),
    defaultValues: { date: new Date().toISOString().slice(0, 10), produceType: 'Grapes' },
  })

  const [crateCountAtWeighing, grossWeightKg, produceType] = watch([
    'crateCountAtWeighing',
    'grossWeightKg',
    'produceType',
  ])

  if (isLoading) return <LoadingState rows={4} />

  if (error || !context) {
    return (
      <>
        <PageHeader title="Weighing" />
        <Alert variant="info">This vehicle trip has already been weighed, or could not be found.</Alert>
      </>
    )
  }

  const tareRate = companySettings?.crateTareWeightKg ? Number(companySettings.crateTareWeightKg) : DEFAULT_CRATE_TARE_WEIGHT_KG

  const crateCountNum = crateCountAtWeighing ?? 0
  const grossWeightNum = grossWeightKg ?? 0
  const tareWeightKg = round2(crateCountNum * tareRate)
  const netFruitWeightKg = round2(grossWeightNum - tareWeightKg)

  const harvestEstimate = context.harvestNumCrates
  const cratesDiffer =
    harvestEstimate !== undefined && crateCountNum > 0 && Math.abs(crateCountNum - harvestEstimate) / harvestEstimate > 0.05

  // Actual observed rejection is recorded but never charged — the farmer is
  // always paid on a fixed 93% of net weight (Business_Rules R28, rewritten).
  const rejectionKg = round2(netFruitWeightKg * (FARMER_REJECTION_PCT / 100))
  const netPayableKg = round2(netFruitWeightKg - rejectionKg)

  // Validate everything except actualRejectionPct first — that field's input
  // lives inside the dialog below, so it must never be the reason the
  // dialog fails to open. It's left blank for the operator to type the real
  // observed figure — there's no contract value to seed it from anymore.
  const openReview = async () => {
    const fieldsToValidate = [
      'date',
      'slipSerialNo',
      'loadId',
      'harvesterNo',
      'noCrtReci',
      'knitting',
      'produceType',
      'averageSize',
      'averageSugar',
      'villageName',
      'contactNo',
      'supervisorName',
      'crateCountAtWeighing',
      'grossWeightKg',
    ] as const
    const valid = await trigger(fieldsToValidate)
    if (!valid) return
    setDialogOpen(true)
  }

  const onSubmit = async (values: WeighingFormValues) => {
    try {
      const record = await createWeighing.mutateAsync({ vehicleTripId, ...values, slipPhoto })
      showToast('Weighing recorded.', 'success')
      navigate(`/weighing/${record.id}`)
    } catch (submitError) {
      showToast(toFriendlyMessage(submitError), 'error')
    }
  }

  return (
    <>
      <PageHeader title="Weighing" description={`${context.farmerName} · ${context.vehicleNo ?? 'Unknown vehicle'}`} />

      <SectionCard title="Reference">
        <ReadOnlyReferenceCard
          title="From harvest record"
          fields={[
            { label: 'Farmer name', value: context.farmerName },
            { label: 'Variety', value: context.variety ?? '—' },
            { label: 'Vehicle number', value: context.vehicleNo ?? '—' },
            { label: 'Driver', value: context.driverName ?? '—' },
            { label: 'MH No.', value: context.mhNumber ?? '—' },
            { label: 'Village name', value: context.villageName ?? '—' },
            { label: 'Crates at harvest', value: context.harvestNumCrates !== undefined ? String(context.harvestNumCrates) : '—' },
          ]}
        />
      </SectionCard>

      <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()} noValidate>
        <SectionCard title="Slip details">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Slip Serial No." htmlFor="slipSerialNo" error={errors.slipSerialNo?.message}>
              <TextInput id="slipSerialNo" hasError={!!errors.slipSerialNo} {...register('slipSerialNo')} />
            </FormField>
            <FormField label="Date" htmlFor="date" required error={errors.date?.message}>
              <DatePicker id="date" hasError={!!errors.date} {...register('date')} />
            </FormField>
            <FormField label="Load Id" htmlFor="loadId" error={errors.loadId?.message}>
              <TextInput id="loadId" hasError={!!errors.loadId} {...register('loadId')} />
            </FormField>
            <FormField label="Harvester No." htmlFor="harvesterNo" error={errors.harvesterNo?.message}>
              <TextInput id="harvesterNo" hasError={!!errors.harvesterNo} {...register('harvesterNo')} />
            </FormField>
            <FormField label="No. Crt Reci" htmlFor="noCrtReci" error={errors.noCrtReci?.message}>
              <TextInput id="noCrtReci" hasError={!!errors.noCrtReci} {...register('noCrtReci')} />
            </FormField>
            <FormField label="Knitting" htmlFor="knitting" error={errors.knitting?.message}>
              <TextInput id="knitting" hasError={!!errors.knitting} {...register('knitting')} />
            </FormField>
            <FormField label="Average Size" htmlFor="averageSize" error={errors.averageSize?.message}>
              <TextInput id="averageSize" hasError={!!errors.averageSize} {...register('averageSize')} />
            </FormField>
            <FormField label="Average Sugar (TSS)" htmlFor="averageSugar" error={errors.averageSugar?.message}>
              <NumberInput
                id="averageSugar"
                unit="°Brix"
                hasError={!!errors.averageSugar}
                {...register('averageSugar', { setValueAs: (v) => (v === '' ? undefined : Number(v)) })}
              />
            </FormField>
            <FormField label="Supervisor" htmlFor="supervisorName" required error={errors.supervisorName?.message}>
              <TextInput id="supervisorName" hasError={!!errors.supervisorName} {...register('supervisorName')} />
            </FormField>
          </div>

          <div className="mt-4">
            <FormField label="Produce Type" htmlFor="produceType">
              <RadioGroup
                name="produceType"
                value={produceType}
                onChange={(value) => setValue('produceType', value)}
                options={[
                  { value: 'Grapes', label: 'Grapes' },
                  { value: 'Pomo', label: 'Pomo' },
                ]}
              />
            </FormField>
          </div>
        </SectionCard>

        <SectionCard title="Crate & weight entry" description="Weighing this vehicle trip only — a harvest with multiple trips gets one weighing record per trip.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              label="Crate Count"
              htmlFor="crateCountAtWeighing"
              required
              error={errors.crateCountAtWeighing?.message}
              hint={context.harvestNumCrates !== undefined ? `Harvest estimate: ${context.harvestNumCrates}` : undefined}
            >
              <NumberInput
                id="crateCountAtWeighing"
                hasError={!!errors.crateCountAtWeighing}
                {...register('crateCountAtWeighing', { valueAsNumber: true })}
              />
            </FormField>
            <FormField label="Gross Weight (kg)" htmlFor="grossWeightKg" required error={errors.grossWeightKg?.message}>
              <NumberInput id="grossWeightKg" unit="kg" hasError={!!errors.grossWeightKg} {...register('grossWeightKg', { valueAsNumber: true })} />
            </FormField>
          </div>

          {cratesDiffer && (
            <p className="mt-2 text-sm font-medium text-amber-700">
              Differs from harvest estimate ({context.harvestNumCrates} crates).
            </p>
          )}

          <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm">
            <p className="text-gray-700">
              Crate Tare: {crateCountNum} × {tareRate.toFixed(2)} kg = <span className="font-semibold">{tareWeightKg.toFixed(2)} kg</span>
            </p>
            <p className="mt-1 text-gray-700">
              Net Fruit Weight: {grossWeightNum.toFixed(2)} − {tareWeightKg.toFixed(2)} = <span className="font-semibold">{netFruitWeightKg.toFixed(2)} kg</span>
            </p>
            <p className="mt-2 font-semibold text-gray-900">This trip's Gross Weight (post-tare): {netFruitWeightKg.toFixed(2)} kg</p>
          </div>
        </SectionCard>

        <SectionCard title="Weighing slip photo">
          <CameraCapture id="slipPhoto" label="weighing slip" value={slipPhoto} onChange={setSlipPhoto} />
        </SectionCard>

        <button
          type="button"
          onClick={openReview}
          disabled={isSubmitting}
          className="min-h-12 rounded-lg bg-brand-700 text-base font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
        >
          Calculate & Review
        </button>
      </form>

      <ConfirmationDialog
        open={dialogOpen}
        title="Rejection Calculation"
        confirmLabel={isSubmitting ? 'Saving...' : 'Confirm & Save'}
        cancelLabel="Cancel"
        onCancel={() => setDialogOpen(false)}
        onConfirm={handleSubmit(onSubmit)}
        description={
          <div className="flex flex-col gap-3 text-left">
            <p className="text-gray-700">
              Gross Weight (post-tare): <span className="font-semibold text-gray-900">{netFruitWeightKg.toFixed(2)} kg</span>
            </p>

            <FormField
              label="Actual rejection % (observed)"
              htmlFor="actualRejectionPct"
              required
              hint="Recorded for reference only. The farmer is always paid on a fixed 93% of net weight (7% rejection) — this figure does not change the payout."
              error={errors.actualRejectionPct?.message}
            >
              <NumberInput
                id="actualRejectionPct"
                unit="%"
                hasError={!!errors.actualRejectionPct}
                {...register('actualRejectionPct', { valueAsNumber: true })}
              />
            </FormField>

            <p className="text-gray-700">
              Rejection Weight (fixed 7%): <span className="font-semibold text-gray-900">{rejectionKg.toFixed(2)} kg</span>
            </p>
            <p className="text-gray-700">
              Net Payable Weight: <span className="font-semibold text-gray-900">{netPayableKg.toFixed(2)} kg</span>
            </p>
            <p className="text-xs text-gray-500">
              Rejection weight and net weight are calculated by the server using a fixed 7% rate — the figures above
              are a preview only.
            </p>
          </div>
        }
      />
    </>
  )
}
