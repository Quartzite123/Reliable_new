import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionCard } from '@/components/layout/SectionCard'
import { EmptyState } from '@/components/data/EmptyState'
import { LoadingState } from '@/components/data/LoadingState'
import { ErrorState } from '@/components/data/ErrorState'
import { useToast } from '@/app/ToastContext'
import { toFriendlyMessage } from '@/utils/errorMessages'
import type { EntityId } from '@/types/common'
import { useCreateArrivalQc, useEligibleHarvestsForArrivalQc } from '../hooks'
import { ArrivalQcForm } from '../components/ArrivalQcForm'
import { arrivalQcSchema, type ArrivalQcFormValues } from '../schema'

export function ArrivalQcNewPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const harvestIdParam = searchParams.get('harvestId')
  const harvestId = harvestIdParam ? Number(harvestIdParam) : undefined

  if (harvestId === undefined) {
    return <EligibleHarvestPicker onPick={(id) => setSearchParams({ harvestId: String(id) })} />
  }

  return <NewArrivalQcForm harvestId={harvestId} onDone={() => navigate(`/arrival-qc/${harvestId}`)} />
}

function EligibleHarvestPicker({ onPick }: { onPick: (harvestId: EntityId) => void }) {
  const { data, isLoading, isError, error, refetch } = useEligibleHarvestsForArrivalQc()

  return (
    <>
      <PageHeader title="New Arrival QC" description="Only harvests that have been weighed are shown." />
      {isLoading && <LoadingState rows={3} />}
      {!isLoading && isError && <ErrorState error={error} onRetry={() => refetch()} />}
      {!isLoading && !isError && (data?.length ?? 0) === 0 && (
        <EmptyState title="No harvests are ready for Arrival QC" description="A harvest must be fully weighed first." />
      )}
      {!isLoading && !isError && data && data.length > 0 && (
        <ul className="flex flex-col gap-2">
          {data.map((row) => (
            <li key={row.harvestId}>
              <button
                type="button"
                onClick={() => onPick(row.harvestId)}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left hover:border-brand-400 hover:bg-brand-50"
              >
                <div>
                  <p className="font-semibold text-gray-900">{row.farmerName}</p>
                  <p className="text-sm text-gray-500">
                    {row.plotNumber}{row.variety ? ` — ${row.variety}` : ''} · Harvested {row.harvestDate} · Season {row.seasonYear}
                  </p>
                </div>
                <span className="text-sm font-semibold text-brand-700">Inspect</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

function NewArrivalQcForm({ harvestId, onDone }: { harvestId: EntityId; onDone: () => void }) {
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
      showToast('Arrival QC recorded.', 'success')
      onDone()
    } catch (error) {
      showToast(toFriendlyMessage(error), 'error')
    }
  }

  return (
    <>
      <PageHeader title="Arrival QC" description="Goods arriving at the packhouse — independent inspection." />
      <SectionCard>
        <div className="mt-4">
          <ArrivalQcForm register={register} errors={errors} watch={watch} setValue={setValue} idPrefix="" />
        </div>
        <button
          type="button"
          onClick={handleSubmit(onSubmit)}
          disabled={isSubmitting}
          className="mt-4 min-h-12 w-full rounded-lg bg-brand-700 text-base font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
        >
          {isSubmitting ? 'Saving...' : 'Save Arrival QC'}
        </button>
      </SectionCard>
    </>
  )
}
