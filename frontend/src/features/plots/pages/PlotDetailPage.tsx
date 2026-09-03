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
import { EmptyState } from '@/components/data/EmptyState'
import { FormField } from '@/components/forms/FormField'
import { NumberInput } from '@/components/forms/NumberInput'
import { DatePicker } from '@/components/forms/DatePicker'
import { RadioGroup } from '@/components/forms/RadioGroup'
import { Select } from '@/components/forms/Select'
import { Textarea } from '@/components/forms/Textarea'
import { ValidationSummary } from '@/components/feedback/ValidationSummary'
import { useToast } from '@/app/ToastContext'
import { toFriendlyMessage } from '@/utils/errorMessages'
import { usePermission } from '@/permissions/usePermission'
import { seasonStatusToBadgeStatus } from '@/types/season'
import { buildWorkflowSteps } from '@/utils/workflowSteps'
import {
  useAddPlotVariety,
  usePlotDetail,
  useRegisterVariety,
  useRemovePlotVariety,
  useSubmitFollowUpFieldQc,
  useUpdatePlotVariety,
} from '../hooks'
import { followUpFieldQcSchema, type FollowUpFieldQcFormValues } from '../schema'
import { GRAPE_VARIETIES, type GrapeVariety, type PlotVariety, type SeasonRegistration } from '../types'

const CURRENT_SEASON_YEAR = new Date().getFullYear()

export function PlotDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading, error, refetch } = usePlotDetail(id ? Number(id) : undefined)
  const canCreateFieldQc = usePermission('fieldQc:create')
  const canManageVarieties = usePermission('plots:create') // same gate as plot creation — backend's plot_varieties endpoints are all require_phase(PLOT_REGISTRATION)
  // A Set, not a single value — a plot can have more than one registration
  // (one per variety) needing Field QC at once. A single nullable value
  // here would silently discard whatever a worker had typed into one
  // registration's form the moment they opened another's — the same
  // silent-data-loss class already fixed twice elsewhere in this app, and
  // exactly the situation a two-variety plot creates.
  const [openFieldQcFor, setOpenFieldQcFor] = useState<Set<EntityId>>(new Set())

  const toggleFieldQcForm = (registrationId: EntityId) => {
    setOpenFieldQcFor((prev) => {
      const next = new Set(prev)
      if (next.has(registrationId)) next.delete(registrationId)
      else next.add(registrationId)
      return next
    })
  }

  if (isLoading) return <LoadingState rows={5} />
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />
  if (!data) return null

  const { plot, registrations, fieldQcByRegistration, plotVarieties } = data
  const latest = registrations[0]

  return (
    <>
      <PageHeader
        title={`${plot.plotNumber} — ${plot.varietyNames?.length ? plot.varietyNames.join(', ') : plot.variety ?? '—'}`}
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

      <SectionCard
        title="Varieties"
        description="Every variety this plot carries. Adding one doesn't register it for a season by itself — that's a separate step below, since a plot's varieties can be added well before or after a given season's registration."
      >
        {plotVarieties.length === 0 ? (
          <EmptyState title="No varieties recorded yet" />
        ) : (
          <div className="flex flex-col gap-2">
            {plotVarieties.map((pv) => (
              <PlotVarietyRow
                key={pv.id}
                plotId={plot.id}
                plotVariety={pv}
                registrations={registrations}
                canManage={canManageVarieties}
                plotAreaAcres={plot.areaAcres}
                otherVarietiesTotal={plotVarieties
                  .filter((other) => other.id !== pv.id)
                  .reduce((sum, other) => sum + (other.areaAcres ? Number(other.areaAcres) : 0), 0)}
              />
            ))}
          </div>
        )}

        {canManageVarieties && (
          <AddVarietyForm plotId={plot.id} plotAreaAcres={plot.areaAcres} existingVarieties={plotVarieties} />
        )}
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
        const isOpen = openFieldQcFor.has(registration.id)
        const variety = registration.varietyName

        return (
          <SectionCard
            key={registration.id}
            title={variety ? `Field QC — Season ${registration.seasonYear} — ${variety}` : `Field QC — Season ${registration.seasonYear}`}
          >
            {qcHistory.length === 0 ? (
              <EmptyState
                title="No inspection recorded yet"
                description={variety ? `Field QC has not been recorded for ${variety} on this plot.` : undefined}
                action={
                  canCreateFieldQc && (
                    <button
                      type="button"
                      onClick={() => toggleFieldQcForm(registration.id)}
                      className="min-h-11 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
                    >
                      {isOpen ? 'Cancel' : 'Record Field QC'}
                    </button>
                  )
                }
              />
            ) : (
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
            )}

            {failed && (
              <div className="mt-3">
                <Alert variant="error" title="Field QC failed">
                  This is kept on record, not deleted. Log a new inspection visit to re-attempt.
                </Alert>
                {canCreateFieldQc && (
                  <button
                    type="button"
                    onClick={() => toggleFieldQcForm(registration.id)}
                    className="mt-2 text-sm font-medium text-brand-700 underline"
                  >
                    {isOpen ? 'Cancel follow-up' : 'Create follow-up / re-attempt'}
                  </button>
                )}
              </div>
            )}

            {isOpen && (
              <FieldQcRecordForm
                plotId={plot.id}
                registrationId={registration.id}
                variety={variety}
                isFollowUp={failed}
                onDone={() => toggleFieldQcForm(registration.id)}
              />
            )}
          </SectionCard>
        )
      })}
    </>
  )
}

/**
 * Records Field QC for one registration — first-ever inspection or a
 * follow-up after a fail, both go through the same POST
 * `/registrations/{id}/field-qc` call (the backend's can_record_field_qc
 * guard accepts REGISTERED and FIELD_QC_FAILED alike), so this is one
 * component, not two. `isFollowUp` only changes copy (button label,
 * success toast) — never gate anything functional on it here; the backend
 * is what actually decides whether this call is allowed.
 *
 * `variety` is rendered as a heading inside the form itself, not just
 * relied on via the SectionCard title above it — that title scrolls out
 * of view on a long form, which is exactly when a worker filling in a
 * second variety's inspection most needs to see which one they're on.
 */
function FieldQcRecordForm({
  plotId,
  registrationId,
  variety,
  isFollowUp,
  onDone,
}: {
  plotId: EntityId
  registrationId: EntityId
  variety?: string
  isFollowUp: boolean
  onDone: () => void
}) {
  const { showToast } = useToast()
  // Bug fixed 2026-09-03: this used to be called with `registrationId` —
  // the hook's parameter is the PLOT id (it invalidates plotsQueryKeys
  // .detail(plotId), which is what PlotDetailPage's usePlotDetail is keyed
  // on). Both are EntityId, so TypeScript couldn't catch the mismatch —
  // it silently invalidated a query key nothing was subscribed to instead
  // of erroring. The save always worked; the page just never refetched,
  // so a worker who didn't manually reload could record the same
  // inspection twice believing the first attempt hadn't saved.
  const submitFollowUp = useSubmitFollowUpFieldQc(plotId)

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
      showToast(isFollowUp ? 'Follow-up inspection recorded.' : 'Field QC recorded.', 'success')
      onDone()
    } catch (error) {
      showToast(toFriendlyMessage(error), 'error')
    }
  }

  return (
    <form className="mt-4 flex flex-col gap-4 rounded-lg border-2 border-dashed border-gray-300 p-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      {variety && (
        <p className="text-sm font-semibold text-gray-800">
          Recording {isFollowUp ? 'a follow-up inspection' : 'Field QC'} for <span className="text-brand-700">{variety}</span>
        </p>
      )}
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
        {isSubmitting ? 'Saving...' : isFollowUp ? 'Submit follow-up inspection' : 'Save Field QC'}
      </button>
    </form>
  )
}

/**
 * One row in the Varieties management section: the variety, its area, a
 * Remove action, and — if this variety doesn't already have a registration
 * for the current season — a "Register for season" action. Deliberately
 * NOT automatic on add (per design): a worker who just added a variety
 * sees this same button on that new row, one explicit click away, rather
 * than a registration silently appearing.
 */
function PlotVarietyRow({
  plotId,
  plotVariety,
  registrations,
  canManage,
  plotAreaAcres,
  otherVarietiesTotal,
}: {
  plotId: EntityId
  plotVariety: PlotVariety
  registrations: SeasonRegistration[]
  canManage: boolean
  plotAreaAcres?: string
  /** Sum of every other variety's area on this plot — this row's own area is added at render time so the warning recomputes live as it's edited. */
  otherVarietiesTotal: number
}) {
  const { showToast } = useToast()
  const removeVariety = useRemovePlotVariety(plotId)
  const registerVariety = useRegisterVariety(plotId)
  const updateVariety = useUpdatePlotVariety(plotId)
  const [isEditingArea, setIsEditingArea] = useState(false)
  const [editedArea, setEditedArea] = useState<number | ''>(plotVariety.areaAcres ? Number(plotVariety.areaAcres) : '')

  // Same soft, dismissible, never-blocking threshold as AddVarietyForm and
  // the registration flow — recomputed against this row's edited value.
  const plotTotal = plotAreaAcres ? Number(plotAreaAcres) : undefined
  const projectedTotal = otherVarietiesTotal + (editedArea === '' ? 0 : editedArea)
  const showAreaWarning = isEditingArea && !!plotTotal && projectedTotal > plotTotal

  const registeredThisSeason = registrations.some(
    (r) => r.plotVarietyId === plotVariety.id && r.seasonYear === CURRENT_SEASON_YEAR,
  )

  const handleRemove = async () => {
    try {
      await removeVariety.mutateAsync(plotVariety.id)
      showToast(`${plotVariety.varietyName} removed.`, 'success')
    } catch (error) {
      // Backend 409s as "Cannot remove variety with existing season
      // registrations" when this variety has any registration at all
      // (not just this season's) — surfaced as-is, no client-side
      // re-check (per design: don't build new validation for this).
      showToast(toFriendlyMessage(error), 'error')
    }
  }

  const handleRegister = async () => {
    try {
      await registerVariety.mutateAsync({ plotVarietyId: plotVariety.id, seasonYear: CURRENT_SEASON_YEAR })
      showToast(`Registered for season ${CURRENT_SEASON_YEAR}. Record its Field QC below.`, 'success')
    } catch (error) {
      showToast(toFriendlyMessage(error), 'error')
    }
  }

  const startEditingArea = () => {
    setEditedArea(plotVariety.areaAcres ? Number(plotVariety.areaAcres) : '')
    setIsEditingArea(true)
  }

  const handleSaveArea = async () => {
    try {
      await updateVariety.mutateAsync({ plotVarietyId: plotVariety.id, areaAcres: editedArea === '' ? undefined : editedArea })
      showToast(`${plotVariety.varietyName}'s area updated.`, 'success')
      setIsEditingArea(false)
    } catch (error) {
      showToast(toFriendlyMessage(error), 'error')
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 p-3">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900">{plotVariety.varietyName}</p>
        {isEditingArea ? (
          <div className="mt-1">
            {showAreaWarning && (
              <div className="mb-2">
                <Alert variant="warning" title="Variety areas add up to more than the plot's total area">
                  {projectedTotal} acres across this plot's varieties with this edit, but the plot is {plotTotal} acres.
                  This isn't blocked — double-check it wasn't a typo, then continue if it's correct.
                </Alert>
              </div>
            )}
            <div className="flex items-center gap-2">
            <NumberInput
              id={`edit-area-${plotVariety.id}`}
              unit="acres"
              step="0.01"
              value={editedArea}
              onChange={(e) => setEditedArea(e.target.value ? Number(e.target.value) : '')}
              className="max-w-40"
            />
            <button
              type="button"
              onClick={handleSaveArea}
              disabled={updateVariety.isPending}
              className="text-sm font-medium text-brand-700 underline disabled:opacity-60"
            >
              {updateVariety.isPending ? 'Saving...' : 'Save'}
            </button>
            <button type="button" onClick={() => setIsEditingArea(false)} className="text-sm font-medium text-gray-600 underline">
              Cancel
            </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            {plotVariety.areaAcres ? `${plotVariety.areaAcres} acres` : 'Area not recorded'}
            {canManage && (
              <button type="button" onClick={startEditingArea} className="ml-2 text-sm font-medium text-brand-700 underline">
                Edit
              </button>
            )}
          </p>
        )}
      </div>
      {canManage && (
        <div className="flex items-center gap-3">
          {registeredThisSeason ? (
            <span className="text-sm text-gray-500">Registered for {CURRENT_SEASON_YEAR}</span>
          ) : (
            <button
              type="button"
              onClick={handleRegister}
              disabled={registerVariety.isPending}
              className="min-h-9 rounded-lg border-2 border-brand-700 px-3 text-sm font-semibold text-brand-800 hover:bg-brand-50 disabled:opacity-60"
            >
              {registerVariety.isPending ? 'Registering...' : `Register for ${CURRENT_SEASON_YEAR}`}
            </button>
          )}
          <button
            type="button"
            onClick={handleRemove}
            disabled={removeVariety.isPending}
            className="text-sm font-medium text-red-700 underline disabled:opacity-60"
          >
            Remove
          </button>
        </div>
      )}
    </div>
  )
}

/** Add-variety mini-form — variety (excluding ones this plot already has) + area, with the same soft over-total warning as the registration flow. */
function AddVarietyForm({
  plotId,
  plotAreaAcres,
  existingVarieties,
}: {
  plotId: EntityId
  plotAreaAcres?: string
  existingVarieties: PlotVariety[]
}) {
  const { showToast } = useToast()
  const addVariety = useAddPlotVariety(plotId)
  const [variety, setVariety] = useState<GrapeVariety | ''>('')
  const [areaAcres, setAreaAcres] = useState<number | ''>('')

  const availableVarieties = GRAPE_VARIETIES.filter((v) => !existingVarieties.some((ev) => ev.varietyName === v))

  // Soft, dismissible-by-nature warning only — never blocks. No warning on
  // an under-total (unallocated area within a plot is normal). Same
  // threshold as the registration flow's multi-variety warning.
  const existingTotal = existingVarieties.reduce((sum, v) => sum + (v.areaAcres ? Number(v.areaAcres) : 0), 0)
  const projectedTotal = existingTotal + (areaAcres === '' ? 0 : areaAcres)
  const plotTotal = plotAreaAcres ? Number(plotAreaAcres) : undefined
  const showAreaWarning = !!plotTotal && projectedTotal > plotTotal

  const handleAdd = async () => {
    if (!variety) {
      showToast('Select a variety to add.', 'error')
      return
    }
    try {
      await addVariety.mutateAsync({ varietyName: variety, areaAcres: areaAcres === '' ? undefined : areaAcres })
      showToast(`${variety} added.`, 'success')
      setVariety('')
      setAreaAcres('')
    } catch (error) {
      showToast(toFriendlyMessage(error), 'error')
    }
  }

  return (
    <div className="mt-4 border-t border-gray-200 pt-4">
      {showAreaWarning && (
        <div className="mb-3">
          <Alert variant="warning" title="Variety areas add up to more than the plot's total area">
            {projectedTotal} acres across this plot's varieties (including this one), but the plot is {plotTotal} acres.
            This isn't blocked — double-check it wasn't a typo, then continue if it's correct.
          </Alert>
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <FormField label="Add a variety" htmlFor="add-variety">
          <Select
            id="add-variety"
            placeholder={availableVarieties.length === 0 ? 'All varieties already added' : 'Select variety'}
            options={availableVarieties.map((v) => ({ value: v, label: v }))}
            value={variety}
            onChange={(e) => setVariety(e.target.value as GrapeVariety)}
          />
        </FormField>
        <FormField label="Area" htmlFor="add-variety-area" hint="Optional">
          <NumberInput
            id="add-variety-area"
            unit="acres"
            step="0.01"
            value={areaAcres}
            onChange={(e) => setAreaAcres(e.target.value ? Number(e.target.value) : '')}
          />
        </FormField>
        <button
          type="button"
          onClick={handleAdd}
          disabled={addVariety.isPending || availableVarieties.length === 0}
          className="min-h-11 rounded-lg bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
        >
          {addVariety.isPending ? 'Adding...' : 'Add variety'}
        </button>
      </div>
    </div>
  )
}
