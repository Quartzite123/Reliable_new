import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useFieldArray, useForm, type FieldErrors, type UseFormRegister, type UseFormSetValue, type UseFormWatch } from 'react-hook-form'
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
import { useRegisterPlotMultiVariety } from '../hooks'
import { emptyVarietyEntry, plotMultiVarietyFieldQcSchema, type PlotMultiVarietyFormValues, type VarietyEntryFormValues } from '../schema'
import { GRAPE_VARIETIES } from '../types'

const CURRENT_SEASON_YEAR = new Date().getFullYear()

/**
 * Combined Plot + Field QC screen (Business_Rules R15a) — one screen for
 * the Field Worker, records underneath: Plot (permanent), one or more
 * plot_varieties, and one season_registration + field_qc per variety
 * (R57 — each variety is a fully independent pipeline).
 *
 * "Does this plot carry more than one variety?" defaults to No — the CEO
 * confirmed this is rare, a few plots a season (2026-09-03) — so the
 * common path is exactly the single-variety form this screen always was,
 * routed through the same underlying multi-variety-capable submit
 * (varieties.length === 1 is just the ordinary case, not a special one).
 */
export function PlotRegistrationPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [searchParams] = useSearchParams()
  const initialFarmerIdParam = searchParams.get('farmerId')
  const initialFarmerId: EntityId | undefined = initialFarmerIdParam ? Number(initialFarmerIdParam) : undefined
  const [farmerId, setFarmerId] = useState<EntityId | null>(initialFarmerId ?? null)
  const { data: lockedFarmer } = useFarmer(initialFarmerId)
  const [hasMultipleVarieties, setHasMultipleVarieties] = useState(false)
  const [collapsedRows, setCollapsedRows] = useState<Set<number>>(new Set())

  const registerPlot = useRegisterPlotMultiVariety()

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<PlotMultiVarietyFormValues>({
    resolver: zodResolver(plotMultiVarietyFieldQcSchema),
    defaultValues: { seasonYear: CURRENT_SEASON_YEAR, varieties: [{}] },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'varieties' })

  const gpsLat = watch('gpsLat')
  const gpsLong = watch('gpsLong')
  const plotAreaAcres = watch('areaAcres')
  const varietyRows = watch('varieties')

  const toggleMultipleVarieties = (yes: boolean) => {
    setHasMultipleVarieties(yes)
    if (yes && fields.length < 2) {
      append(emptyVarietyEntry as VarietyEntryFormValues)
    } else if (!yes) {
      for (let i = fields.length - 1; i > 0; i--) remove(i)
      setCollapsedRows(new Set())
    }
  }

  const toggleRowCollapsed = (index: number) => {
    setCollapsedRows((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  // Soft, dismissible-by-nature warning only — never blocks submit. No
  // warning for an under-total: unallocated/non-varietal area within a
  // plot is normal (agreed design, not guessed).
  const totalVarietyArea = (varietyRows ?? []).reduce((sum, v) => sum + (v?.areaAcres ?? 0), 0)
  const showAreaWarning = hasMultipleVarieties && !!plotAreaAcres && totalVarietyArea > plotAreaAcres

  const varietiesErrors = errors.varieties as
    | (Record<string, { message?: string }> | undefined)[] & { root?: { message?: string } }
    | undefined

  const errorMessages = [
    ...Object.entries(errors)
      .filter(([key]) => key !== 'varieties')
      .map(([, e]) => (e && 'message' in e ? (e as { message?: string }).message : undefined))
      .filter((m): m is string => !!m),
    ...(varietiesErrors?.root?.message ? [varietiesErrors.root.message] : []),
    ...(Array.isArray(varietiesErrors) ? varietiesErrors : [])
      .flatMap((rowErrors, index) =>
        rowErrors ? Object.values(rowErrors).map((e) => (e?.message ? `Variety ${index + 1}: ${e.message}` : undefined)) : [],
      )
      .filter((m): m is string => !!m),
  ]

  const onSubmit = async (values: PlotMultiVarietyFormValues) => {
    if (!farmerId) {
      showToast('Select a farmer.', 'error')
      return
    }
    try {
      const varieties = values.varieties.map((v) => ({
        ...v,
        // Single-variety case: the variety occupies the whole plot — no
        // separate area question asked, derived from the plot's own area
        // instead. Multi-variety case: whatever was entered per row,
        // including left blank.
        areaAcres: hasMultipleVarieties ? v.areaAcres : (v.areaAcres ?? values.areaAcres),
      }))

      const { plot, results } = await registerPlot.mutateAsync({ ...values, farmerId, varieties })

      const succeeded = results.filter((r) => r.success)
      const failed = results.filter((r) => !r.success)

      if (failed.length === 0) {
        showToast(
          results.length > 1
            ? `Plot registered with ${results.length} varieties: ${succeeded.map((r) => r.variety).join(', ')}.`
            : 'Plot registered and Field QC recorded.',
          'success',
        )
      } else {
        // Sequential, non-transactional chain per variety (see
        // plotsApi.registerMultipleVarieties) — name exactly what
        // succeeded and what didn't, and point at where to finish it. The
        // Varieties section referenced here now genuinely exists on the
        // plot detail page we're about to navigate to.
        const parts = [
          ...succeeded.map((r) => `${r.variety} registered.`),
          ...failed.map((r) => `${r.variety} failed: ${toFriendlyMessage(r.error)}`),
        ]
        showToast(`${parts.join(' ')} Finish from this plot's Varieties section below.`, 'error')
      }

      navigate(`/plots/${plot.id}`)
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors) {
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          setError(field as keyof PlotMultiVarietyFormValues, { message })
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

        <SectionCard title="Varieties" description="Almost every plot carries one variety — only say yes below if this one genuinely has more than one.">
          <FormField label="Does this plot carry more than one variety?" htmlFor="hasMultipleVarieties">
            <RadioGroup
              name="hasMultipleVarieties"
              value={hasMultipleVarieties ? 'yes' : 'no'}
              onChange={(v) => toggleMultipleVarieties(v === 'yes')}
              options={[
                { value: 'no', label: 'No — one variety' },
                { value: 'yes', label: 'Yes — more than one' },
              ]}
            />
          </FormField>

          {showAreaWarning && (
            <div className="mt-3">
              <Alert variant="warning" title="Variety areas add up to more than the plot's total area">
                {totalVarietyArea} acres entered across the varieties below, but the plot is {plotAreaAcres} acres.
                This isn't blocked — double-check it wasn't a typo, then continue if it's correct.
              </Alert>
            </div>
          )}

          <div className="mt-4 flex flex-col gap-4">
            {fields.map((field, index) => (
              <VarietyFieldQcRow
                key={field.id}
                index={index}
                isMulti={hasMultipleVarieties}
                canRemove={hasMultipleVarieties && fields.length > 1}
                onRemove={() => remove(index)}
                collapsed={collapsedRows.has(index)}
                onToggleCollapsed={() => toggleRowCollapsed(index)}
                register={register}
                watch={watch}
                setValue={setValue}
                errors={errors.varieties?.[index]}
              />
            ))}
          </div>

          {hasMultipleVarieties && (
            <button
              type="button"
              onClick={() => append(emptyVarietyEntry as VarietyEntryFormValues)}
              className="mt-3 min-h-11 rounded-lg border-2 border-brand-700 px-4 text-sm font-semibold text-brand-800 hover:bg-brand-50"
            >
              + Add another variety
            </button>
          )}
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

interface VarietyFieldQcRowProps {
  index: number
  isMulti: boolean
  canRemove: boolean
  onRemove: () => void
  collapsed: boolean
  onToggleCollapsed: () => void
  register: UseFormRegister<PlotMultiVarietyFormValues>
  watch: UseFormWatch<PlotMultiVarietyFormValues>
  setValue: UseFormSetValue<PlotMultiVarietyFormValues>
  errors?: FieldErrors<VarietyEntryFormValues>
}

/**
 * One variety's row: variety + (multi-mode only) area, then its own Field
 * QC block. Collapsible only in multi-mode — a worker filling in a second
 * variety's inspection needs to be able to tell which one they're on at a
 * glance, and a flat scroll of two near-identical Field QC blocks doesn't
 * do that; a labeled, collapsible section does.
 */
function VarietyFieldQcRow({
  index,
  isMulti,
  canRemove,
  onRemove,
  collapsed,
  onToggleCollapsed,
  register,
  watch,
  setValue,
  errors,
}: VarietyFieldQcRowProps) {
  const variety = watch(`varieties.${index}.variety`)
  const label = variety || `Variety ${index + 1}`

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Variety" htmlFor={`variety-${index}`} required error={errors?.variety?.message}>
            <Select
              id={`variety-${index}`}
              hasError={!!errors?.variety}
              options={GRAPE_VARIETIES.map((v) => ({ value: v, label: v }))}
              placeholder="Select variety"
              {...register(`varieties.${index}.variety`)}
            />
          </FormField>
          {isMulti && (
            <FormField label="Area" htmlFor={`variety-area-${index}`} hint="Optional" error={errors?.areaAcres?.message}>
              <NumberInput
                id={`variety-area-${index}`}
                unit="acres"
                step="0.01"
                hasError={!!errors?.areaAcres}
                {...register(`varieties.${index}.areaAcres`, { valueAsNumber: true })}
              />
            </FormField>
          )}
        </div>
        {canRemove && (
          <button type="button" onClick={onRemove} className="mt-6 text-sm font-medium text-red-700 underline">
            Remove
          </button>
        )}
      </div>

      {isMulti ? (
        <div className="mt-3">
          <button type="button" onClick={onToggleCollapsed} className="text-sm font-medium text-brand-700 underline">
            {collapsed ? `Show Field QC — ${label}` : `Hide Field QC — ${label}`}
          </button>
          {!collapsed && (
            <div className="mt-3">
              <FieldQcFields index={index} register={register} watch={watch} setValue={setValue} errors={errors} />
            </div>
          )}
        </div>
      ) : (
        <div className="mt-4">
          <FieldQcFields index={index} register={register} watch={watch} setValue={setValue} errors={errors} />
        </div>
      )}
    </div>
  )
}

function FieldQcFields({
  index,
  register,
  watch,
  setValue,
  errors,
}: {
  index: number
  register: UseFormRegister<PlotMultiVarietyFormValues>
  watch: UseFormWatch<PlotMultiVarietyFormValues>
  setValue: UseFormSetValue<PlotMultiVarietyFormValues>
  errors?: FieldErrors<VarietyEntryFormValues>
}) {
  const fruitColour = watch(`varieties.${index}.fruitColour`)
  const overallObservation = watch(`varieties.${index}.overallObservation`)
  const result = watch(`varieties.${index}.result`)

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Inspection date" htmlFor={`inspectionDate-${index}`} required error={errors?.inspectionDate?.message}>
          <DatePicker id={`inspectionDate-${index}`} hasError={!!errors?.inspectionDate} {...register(`varieties.${index}.inspectionDate`)} />
        </FormField>
        <FormField label="Planned sampling date" htmlFor={`plannedSamplingDate-${index}`}>
          <DatePicker id={`plannedSamplingDate-${index}`} {...register(`varieties.${index}.plannedSamplingDate`)} />
        </FormField>
      </div>

      <FormField label="Fruit colour" htmlFor={`fruitColour-${index}`} required error={errors?.fruitColour?.message}>
        <RadioGroup
          name={`fruitColour-${index}`}
          value={fruitColour}
          onChange={(v) => setValue(`varieties.${index}.fruitColour`, v as VarietyEntryFormValues['fruitColour'])}
          options={[
            { value: 'Green', label: 'Green' },
            { value: 'Milky Green', label: 'Milky Green' },
            { value: 'Yellow', label: 'Yellow' },
          ]}
        />
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="TSS percentage" htmlFor={`tssPercent-${index}`} required error={errors?.tssPercent?.message}>
          <NumberInput id={`tssPercent-${index}`} unit="%" hasError={!!errors?.tssPercent} {...register(`varieties.${index}.tssPercent`, { valueAsNumber: true })} />
        </FormField>
        <FormField label="Thrips mark percentage" htmlFor={`thripsPercent-${index}`} required error={errors?.thripsPercent?.message}>
          <NumberInput id={`thripsPercent-${index}`} unit="%" hasError={!!errors?.thripsPercent} {...register(`varieties.${index}.thripsPercent`, { valueAsNumber: true })} />
        </FormField>
        <FormField label="Bhuri percentage" htmlFor={`bhuriPercent-${index}`} required error={errors?.bhuriPercent?.message}>
          <NumberInput id={`bhuriPercent-${index}`} unit="%" hasError={!!errors?.bhuriPercent} {...register(`varieties.${index}.bhuriPercent`, { valueAsNumber: true })} />
        </FormField>
        <FormField label="Black spot percentage" htmlFor={`blackSpotPercent-${index}`} required error={errors?.blackSpotPercent?.message}>
          <NumberInput id={`blackSpotPercent-${index}`} unit="%" hasError={!!errors?.blackSpotPercent} {...register(`varieties.${index}.blackSpotPercent`, { valueAsNumber: true })} />
        </FormField>
        <FormField label="Cercospora/Kharda percentage" htmlFor={`cercosporaPercent-${index}`} required error={errors?.cercosporaPercent?.message}>
          <NumberInput id={`cercosporaPercent-${index}`} unit="%" hasError={!!errors?.cercosporaPercent} {...register(`varieties.${index}.cercosporaPercent`, { valueAsNumber: true })} />
        </FormField>
        <FormField label="Exportable fruit quantity" htmlFor={`exportableFruitPercent-${index}`} required error={errors?.exportableFruitPercent?.message}>
          <NumberInput id={`exportableFruitPercent-${index}`} unit="%" hasError={!!errors?.exportableFruitPercent} {...register(`varieties.${index}.exportableFruitPercent`, { valueAsNumber: true })} />
        </FormField>
      </div>

      <FormField label="Overall observation" htmlFor={`overallObservation-${index}`} required error={errors?.overallObservation?.message}>
        <RadioGroup
          name={`overallObservation-${index}`}
          value={overallObservation}
          onChange={(v) => setValue(`varieties.${index}.overallObservation`, v as VarietyEntryFormValues['overallObservation'])}
          options={[
            { value: 'Good', label: 'Good' },
            { value: 'Very Good', label: 'Very Good' },
            { value: 'Excellent', label: 'Excellent' },
          ]}
        />
      </FormField>

      <FormField label="Remarks" htmlFor={`notes-${index}`}>
        <Textarea id={`notes-${index}`} {...register(`varieties.${index}.notes`)} />
      </FormField>

      <FormField label="Result" htmlFor={`result-${index}`} required error={errors?.result?.message}>
        <RadioGroup
          name={`result-${index}`}
          value={result}
          onChange={(v) => setValue(`varieties.${index}.result`, v as VarietyEntryFormValues['result'])}
          options={[
            { value: 'Pass', label: 'Pass' },
            { value: 'Fail', label: 'Fail' },
          ]}
        />
      </FormField>
    </div>
  )
}
