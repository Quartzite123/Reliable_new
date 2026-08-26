import { useState } from 'react'
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
import { RadioGroup } from '@/components/forms/RadioGroup'
import { Textarea } from '@/components/forms/Textarea'
import { GPSCapture } from '@/components/forms/GPSCapture'
import { ValidationSummary } from '@/components/feedback/ValidationSummary'
import { Alert } from '@/components/feedback/Alert'
import { ApiError } from '@/api/httpClient'
import { useToast } from '@/app/ToastContext'
import { toFriendlyMessage } from '@/utils/errorMessages'
import { FarmerSelector } from '@/features/farmers/components/FarmerSelector'
import { useFarmer } from '@/features/farmers/hooks'
import type { EntityId } from '@/types/common'
import { useRegisterPlotWithFieldQc } from '../hooks'
import { plotFieldQcSchema, type PlotFieldQcFormValues } from '../schema'
import { GRAPE_VARIETIES } from '../types'

const CURRENT_SEASON_YEAR = new Date().getFullYear()

/**
 * Combined Plot + Field QC screen (Business_Rules R15a) — one screen for
 * the Field Worker, two records underneath (Plot is permanent, Field QC is
 * a fresh row every season/visit).
 */
export function PlotRegistrationPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [searchParams] = useSearchParams()
  const initialFarmerIdParam = searchParams.get('farmerId')
  const initialFarmerId: EntityId | undefined = initialFarmerIdParam ? Number(initialFarmerIdParam) : undefined
  const [farmerId, setFarmerId] = useState<EntityId | null>(initialFarmerId ?? null)
  const { data: lockedFarmer } = useFarmer(initialFarmerId)

  const registerPlot = useRegisterPlotWithFieldQc()

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PlotFieldQcFormValues>({
    resolver: zodResolver(plotFieldQcSchema),
    defaultValues: { seasonYear: CURRENT_SEASON_YEAR },
  })

  const gpsLat = watch('gpsLat')
  const gpsLong = watch('gpsLong')
  const fruitColour = watch('fruitColour')
  const overallObservation = watch('overallObservation')

  const errorMessages = Object.values(errors)
    .map((e) => e?.message)
    .filter((m): m is string => !!m)

  const onSubmit = async (values: PlotFieldQcFormValues) => {
    if (!farmerId) {
      showToast('Select a farmer.', 'error')
      return
    }
    try {
      const { plot } = await registerPlot.mutateAsync({ ...values, farmerId })
      showToast('Plot registered and Field QC recorded.', 'success')
      navigate(`/plots/${plot.id}`)
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors) {
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          setError(field as keyof PlotFieldQcFormValues, { message })
        }
      } else {
        showToast(toFriendlyMessage(error), 'error')
      }
    }
  }

  return (
    <>
      <PageHeader title="Register Plot & Field QC" description="One visit — records the plot and this inspection together." />

      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <ValidationSummary errors={errorMessages} />

        <SectionCard title="Farmer">
          {lockedFarmer ? (
            <p className="text-sm text-gray-700">
              <span className="font-semibold">{lockedFarmer.name}</span>
            </p>
          ) : (
            <FormField label="Farmer" htmlFor="farmerId" required>
              <FarmerSelector id="farmerId" value={farmerId} onChange={setFarmerId} />
            </FormField>
          )}
        </SectionCard>

        <SectionCard title="Plot details">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Plot Number" htmlFor="plotNumber" required error={errors.plotNumber?.message}>
              <TextInput id="plotNumber" hasError={!!errors.plotNumber} {...register('plotNumber')} />
            </FormField>
            <FormField
              label="MH Registration Number"
              htmlFor="mhRegistrationNumber"
              required
              error={errors.mhRegistrationNumber?.message}
            >
              <TextInput
                id="mhRegistrationNumber"
                hasError={!!errors.mhRegistrationNumber}
                {...register('mhRegistrationNumber')}
              />
            </FormField>
            <FormField label="Variety" htmlFor="variety" required error={errors.variety?.message}>
              <Select
                id="variety"
                hasError={!!errors.variety}
                options={GRAPE_VARIETIES.map((v) => ({ value: v, label: v }))}
                placeholder="Select variety"
                {...register('variety')}
              />
            </FormField>
            <FormField label="Area" htmlFor="areaAcres" required error={errors.areaAcres?.message}>
              <NumberInput id="areaAcres" unit="acres" step="0.01" hasError={!!errors.areaAcres} {...register('areaAcres', { valueAsNumber: true })} />
            </FormField>
            <FormField label="Village" htmlFor="village" required error={errors.village?.message}>
              <TextInput id="village" hasError={!!errors.village} {...register('village')} />
            </FormField>
            <FormField label="Taluka" htmlFor="taluka" required error={errors.taluka?.message}>
              <TextInput id="taluka" hasError={!!errors.taluka} {...register('taluka')} />
            </FormField>
            <FormField label="Survey/Gat Number" htmlFor="surveyNo" required error={errors.surveyNo?.message}>
              <TextInput id="surveyNo" hasError={!!errors.surveyNo} {...register('surveyNo')} />
            </FormField>
            <FormField label="Pruning date" htmlFor="pruningDate">
              <DatePicker id="pruningDate" {...register('pruningDate')} />
            </FormField>
            <FormField label="Expected harvest date" htmlFor="approxHarvestDate">
              <DatePicker id="approxHarvestDate" {...register('approxHarvestDate')} />
            </FormField>
          </div>

          <div className="mt-4">
            <GPSCapture
              value={gpsLat && gpsLong ? { latitude: gpsLat, longitude: gpsLong } : null}
              onCapture={(pos) => {
                setValue('gpsLat', pos.latitude)
                setValue('gpsLong', pos.longitude)
              }}
            />
          </div>
        </SectionCard>

        <SectionCard title="Season">
          <FormField label="Season year" htmlFor="seasonYear" required error={errors.seasonYear?.message}>
            <NumberInput id="seasonYear" hasError={!!errors.seasonYear} {...register('seasonYear', { valueAsNumber: true })} />
          </FormField>
        </SectionCard>

        <SectionCard title="Field QC inspection">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Inspection date" htmlFor="inspectionDate" required error={errors.inspectionDate?.message}>
              <DatePicker id="inspectionDate" hasError={!!errors.inspectionDate} {...register('inspectionDate')} />
            </FormField>
            <FormField label="Planned sampling date" htmlFor="plannedSamplingDate">
              <DatePicker id="plannedSamplingDate" {...register('plannedSamplingDate')} />
            </FormField>
          </div>

          <FormField label="Fruit colour" htmlFor="fruitColour" required error={errors.fruitColour?.message}>
            <RadioGroup
              name="fruitColour"
              value={fruitColour}
              onChange={(v) => setValue('fruitColour', v as PlotFieldQcFormValues['fruitColour'])}
              options={[
                { value: 'Green', label: 'Green' },
                { value: 'Milky Green', label: 'Milky Green' },
                { value: 'Yellow', label: 'Yellow' },
              ]}
            />
          </FormField>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="TSS percentage" htmlFor="tssPercent" required error={errors.tssPercent?.message}>
              <NumberInput id="tssPercent" unit="%" hasError={!!errors.tssPercent} {...register('tssPercent', { valueAsNumber: true })} />
            </FormField>
            <FormField label="Thrips mark percentage" htmlFor="thripsPercent" required error={errors.thripsPercent?.message}>
              <NumberInput id="thripsPercent" unit="%" hasError={!!errors.thripsPercent} {...register('thripsPercent', { valueAsNumber: true })} />
            </FormField>
            <FormField label="Bhuri percentage" htmlFor="bhuriPercent" required error={errors.bhuriPercent?.message}>
              <NumberInput id="bhuriPercent" unit="%" hasError={!!errors.bhuriPercent} {...register('bhuriPercent', { valueAsNumber: true })} />
            </FormField>
            <FormField label="Black spot percentage" htmlFor="blackSpotPercent" required error={errors.blackSpotPercent?.message}>
              <NumberInput id="blackSpotPercent" unit="%" hasError={!!errors.blackSpotPercent} {...register('blackSpotPercent', { valueAsNumber: true })} />
            </FormField>
            <FormField label="Cercospora/Kharda percentage" htmlFor="cercosporaPercent" required error={errors.cercosporaPercent?.message}>
              <NumberInput id="cercosporaPercent" unit="%" hasError={!!errors.cercosporaPercent} {...register('cercosporaPercent', { valueAsNumber: true })} />
            </FormField>
            <FormField label="Exportable fruit quantity" htmlFor="exportableFruitPercent" required error={errors.exportableFruitPercent?.message}>
              <NumberInput id="exportableFruitPercent" unit="%" hasError={!!errors.exportableFruitPercent} {...register('exportableFruitPercent', { valueAsNumber: true })} />
            </FormField>
          </div>

          <FormField label="Overall observation" htmlFor="overallObservation" required error={errors.overallObservation?.message}>
            <RadioGroup
              name="overallObservation"
              value={overallObservation}
              onChange={(v) => setValue('overallObservation', v as PlotFieldQcFormValues['overallObservation'])}
              options={[
                { value: 'Good', label: 'Good' },
                { value: 'Very Good', label: 'Very Good' },
                { value: 'Excellent', label: 'Excellent' },
              ]}
            />
          </FormField>

          <FormField label="Remarks" htmlFor="notes">
            <Textarea id="notes" {...register('notes')} />
          </FormField>

          <FormField label="Result" htmlFor="result" required error={errors.result?.message}>
            <RadioGroup
              name="result"
              value={watch('result')}
              onChange={(v) => setValue('result', v as PlotFieldQcFormValues['result'])}
              options={[
                { value: 'Pass', label: 'Pass' },
                { value: 'Fail', label: 'Fail' },
              ]}
            />
          </FormField>
        </SectionCard>

        <Alert variant="info">
          A failed result stays on record — you can log a follow-up visit any time from the plot's detail page.
        </Alert>

        <button
          type="submit"
          disabled={isSubmitting}
          className="min-h-12 rounded-lg bg-brand-700 text-base font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
        >
          {isSubmitting ? 'Saving...' : 'Save plot & Field QC'}
        </button>
      </form>
    </>
  )
}
