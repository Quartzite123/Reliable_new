import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionCard } from '@/components/layout/SectionCard'
import { EmptyState } from '@/components/data/EmptyState'
import { LoadingState } from '@/components/data/LoadingState'
import { ErrorState } from '@/components/data/ErrorState'
import { Alert } from '@/components/feedback/Alert'
import { PrerequisitePanel } from '@/components/workflow/PrerequisitePanel'
import { FormField } from '@/components/forms/FormField'
import { NumberInput } from '@/components/forms/NumberInput'
import { DatePicker } from '@/components/forms/DatePicker'
import { Textarea } from '@/components/forms/Textarea'
import { useToast } from '@/app/ToastContext'
import { toFriendlyMessage } from '@/utils/errorMessages'
import type { EntityId } from '@/types/common'
import { useContractPrerequisites, useCreateContract, useEligiblePlotsForContract } from '../hooks'
import { contractSchema, type ContractFormValues } from '../schema'

export function ContractNewPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const seasonRegistrationIdParam = searchParams.get('seasonRegistrationId')
  const seasonRegistrationId = seasonRegistrationIdParam ? Number(seasonRegistrationIdParam) : undefined

  if (seasonRegistrationId === undefined) {
    return <EligiblePlotPicker onPick={(id) => setSearchParams({ seasonRegistrationId: String(id) })} />
  }

  return <ContractForm seasonRegistrationId={seasonRegistrationId} onCreated={(id) => navigate(`/contracts/${id}`)} />
}

function EligiblePlotPicker({ onPick }: { onPick: (seasonRegistrationId: EntityId) => void }) {
  const { data, isLoading, isError, error, refetch } = useEligiblePlotsForContract()

  return (
    <>
      <PageHeader title="New Contract" description="Only plots that passed Lab are shown." />
      {isLoading && <LoadingState rows={3} />}
      {!isLoading && isError && <ErrorState error={error} onRetry={() => refetch()} />}
      {!isLoading && !isError && (data?.length ?? 0) === 0 && (
        <EmptyState title="No plots are ready for a contract" description="A plot must pass Field QC and Lab first." />
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
                  <p className="font-semibold text-gray-900">{row.farmerName}</p>
                  <p className="text-sm text-gray-500">
                    {row.plotNumber} · Season {row.seasonYear}
                  </p>
                </div>
                <span className="text-sm font-semibold text-brand-700">Create contract</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

function ContractForm({
  seasonRegistrationId,
  onCreated,
}: {
  seasonRegistrationId: EntityId
  onCreated: (id: EntityId) => void
}) {
  const { showToast } = useToast()
  const { data: prereqs, isLoading, isError, error, refetch } = useContractPrerequisites(seasonRegistrationId)
  const createContract = useCreateContract()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContractFormValues>({
    resolver: zodResolver(contractSchema),
  })

  if (isLoading) return <LoadingState rows={4} />
  if (isError) return <ErrorState error={error} onRetry={() => refetch()} />
  if (!prereqs) return null

  const allMet = prereqs.fieldQcPassed && prereqs.labPassed && prereqs.bankDetailsExist

  const onSubmit = async (values: ContractFormValues) => {
    try {
      const contract = await createContract.mutateAsync({ seasonRegistrationId, ...values })
      showToast('Contract created.', 'success')
      onCreated(contract.id)
    } catch (error) {
      showToast(toFriendlyMessage(error), 'error')
    }
  }

  return (
    <>
      <PageHeader title="New Contract" description={`${prereqs.farmerName} — ${prereqs.plotNumber} · Season ${prereqs.seasonYear}`} />

      <PrerequisitePanel
        items={[
          { label: 'Field QC Passed', met: prereqs.fieldQcPassed },
          { label: 'Lab Passed', met: prereqs.labPassed },
          {
            label: 'Bank Details Available',
            met: prereqs.bankDetailsExist,
            resolveHref: `/farmers/${prereqs.farmerId}/bank-details`,
            resolveLabel: 'Add bank details',
          },
        ]}
      />

      {allMet && (
        <SectionCard title="Contract terms">
          <Alert variant="info">
            Rejection is a fixed 7% company-wide — the farmer is always paid on 93% of net weight. It's not set per
            contract.
          </Alert>
          <form className="mt-4 flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            <FormField label="Contract date" htmlFor="contractDate" required error={errors.contractDate?.message}>
              <DatePicker id="contractDate" hasError={!!errors.contractDate} {...register('contractDate')} />
            </FormField>
            <FormField label="Rate per kg" htmlFor="ratePerKg" required error={errors.ratePerKg?.message}>
              <NumberInput id="ratePerKg" unit="₹/kg" step="0.01" hasError={!!errors.ratePerKg} {...register('ratePerKg', { valueAsNumber: true })} />
            </FormField>
            <FormField label="Terms" htmlFor="terms">
              <Textarea id="terms" {...register('terms')} />
            </FormField>
            <FormField label="Notes" htmlFor="notes">
              <Textarea id="notes" {...register('notes')} />
            </FormField>

            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-12 rounded-lg bg-brand-700 text-base font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
            >
              {isSubmitting ? 'Saving...' : 'Create contract'}
            </button>
          </form>
        </SectionCard>
      )}
    </>
  )
}
