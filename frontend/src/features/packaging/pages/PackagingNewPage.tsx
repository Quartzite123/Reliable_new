import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionCard } from '@/components/layout/SectionCard'
import { EmptyState } from '@/components/data/EmptyState'
import { LoadingState } from '@/components/data/LoadingState'
import { ErrorState } from '@/components/data/ErrorState'
import { ReadOnlyReferenceCard } from '@/components/workflow/ReadOnlyReferenceCard'
import { Alert } from '@/components/feedback/Alert'
import { FormField } from '@/components/forms/FormField'
import { TextInput } from '@/components/forms/TextInput'
import { NumberInput } from '@/components/forms/NumberInput'
import { Select } from '@/components/forms/Select'
import { DatePicker } from '@/components/forms/DatePicker'
import { useToast } from '@/app/ToastContext'
import { toFriendlyMessage } from '@/utils/errorMessages'
import type { EntityId } from '@/types/common'
import { useCustomers } from '@/features/customers/hooks'
import { useCreatePackaging, useEligibleHarvestsForPackaging } from '../hooks'
import { packagingSchema, type PackagingFormValues } from '../schema'
import { COMPLIANCE_TYPES, customersForVariety, packSizesFor, type PackSize } from '../comboSeed'
import type { EligibleHarvestForPackaging } from '../types'

export function PackagingNewPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const harvestIdParam = searchParams.get('harvestId')
  const harvestId = harvestIdParam ? Number(harvestIdParam) : undefined

  if (harvestId === undefined) {
    return <EligibleHarvestPicker onPick={(id) => setSearchParams({ harvestId: String(id) })} />
  }

  return <PackagingForm harvestId={harvestId} onCreated={(id) => navigate(`/packaging/${id}`)} />
}

function EligibleHarvestPicker({ onPick }: { onPick: (harvestId: EntityId) => void }) {
  const { data, isLoading, isError, error, refetch } = useEligibleHarvestsForPackaging()

  return (
    <>
      <PageHeader title="New Packing Run" description="Only harvests that passed Arrival QC are shown." />
      {isLoading && <LoadingState rows={3} />}
      {!isLoading && isError && <ErrorState error={error} onRetry={() => refetch()} />}
      {!isLoading && !isError && (data?.length ?? 0) === 0 && (
        <EmptyState title="No harvests are ready for packaging" description="A harvest must pass Arrival QC first." />
      )}
      {!isLoading && !isError && data && data.length > 0 && (
        <ul className="flex flex-col gap-2">
          {data.map((row: EligibleHarvestForPackaging) => (
            <li key={row.harvestId}>
              <button
                type="button"
                onClick={() => onPick(row.harvestId)}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left hover:border-brand-400 hover:bg-brand-50"
              >
                <div>
                  <p className="font-semibold text-gray-900">{row.farmerName}</p>
                  <p className="text-sm text-gray-500">
                    {row.plotNumber} — {row.variety} · Harvested {row.harvestDate}
                    {row.packingRunsSoFar > 0 && ` · ${row.packingRunsSoFar} run(s) already packed`}
                  </p>
                </div>
                <span className="text-sm font-semibold text-brand-700">Pack this harvest</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

function PackagingForm({ harvestId, onCreated }: { harvestId: EntityId; onCreated: (id: EntityId) => void }) {
  const { showToast } = useToast()
  const { data: eligibleHarvests, isLoading } = useEligibleHarvestsForPackaging()
  const { data: customers } = useCustomers()
  const createPackaging = useCreatePackaging()

  const harvestInfo = eligibleHarvests?.find((h) => h.harvestId === harvestId)

  const [customerId, setCustomerId] = useState<EntityId | ''>('')
  const [packSize, setPackSize] = useState<PackSize | ''>('')

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PackagingFormValues>({ resolver: zodResolver(packagingSchema) })

  const totalWeightKg = watch('totalWeightKg')
  const actualRejectionKg = watch('actualRejectionKg')

  if (isLoading) return <LoadingState rows={4} />
  if (!harvestInfo) return <EmptyState title="This harvest is not ready for packaging" />

  const availableCustomerNames = harvestInfo.variety ? customersForVariety(harvestInfo.variety) : []
  const availableCustomers = (customers ?? []).filter((c) => availableCustomerNames.includes(c.name))
  const selectedCustomerName = availableCustomers.find((c) => c.id === customerId)?.name
  const availablePackSizes = selectedCustomerName && harvestInfo.variety ? packSizesFor(harvestInfo.variety, selectedCustomerName) : []

  const contractRejectionKgPreview =
    typeof totalWeightKg === 'number' ? Math.round(totalWeightKg * (harvestInfo.contractRejectionPercent / 100) * 100) / 100 : null
  const netWeightKgPreview =
    typeof totalWeightKg === 'number' && typeof actualRejectionKg === 'number' ? totalWeightKg - actualRejectionKg : null
  const actualRejectionPctPreview =
    typeof totalWeightKg === 'number' && totalWeightKg > 0 && typeof actualRejectionKg === 'number'
      ? Math.round((actualRejectionKg / totalWeightKg) * 100 * 100) / 100
      : null
  const exceedsContractRejection =
    actualRejectionPctPreview !== null && actualRejectionPctPreview > harvestInfo.contractRejectionPercent

  const onSubmit = async (values: PackagingFormValues) => {
    if (!customerId) {
      showToast('Select a customer.', 'error')
      return
    }
    if (!packSize) {
      showToast('Select a pack size.', 'error')
      return
    }
    try {
      const record = await createPackaging.mutateAsync({ harvestId, ...values, customerId, packSize })
      showToast('Packing run saved.', 'success')
      onCreated(record.id)
    } catch (error) {
      showToast(toFriendlyMessage(error), 'error')
    }
  }

  return (
    <>
      <PageHeader title="New Packing Run" description={`${harvestInfo.farmerName} — ${harvestInfo.plotNumber}`} />

      <SectionCard title="Reference">
        <ReadOnlyReferenceCard
          title="From harvest record"
          fields={[
            { label: 'Variety', value: harvestInfo.variety ?? '—' },
            { label: 'Harvest date', value: harvestInfo.harvestDate },
            { label: 'Contract rejection %', value: `${harvestInfo.contractRejectionPercent}%` },
          ]}
        />
      </SectionCard>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <SectionCard title="Cascading selection" description="Customer and pack size options are limited to this variety's valid combinations.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Customer" htmlFor="customerId" required>
              <Select
                id="customerId"
                value={customerId}
                onChange={(e) => {
                  setCustomerId(e.target.value ? Number(e.target.value) : '')
                  setPackSize('')
                }}
                options={availableCustomers.map((c) => ({ value: c.id, label: c.name }))}
                placeholder="Select customer"
              />
            </FormField>
            <FormField label="Pack size" htmlFor="packSize" required>
              <Select
                id="packSize"
                disabled={!customerId}
                options={availablePackSizes.map((size) => ({ value: size, label: size }))}
                placeholder={customerId ? 'Select pack size' : 'Select a customer first'}
                value={packSize}
                onChange={(e) => setPackSize(e.target.value as PackSize)}
              />
            </FormField>
            <FormField label="Compliance" htmlFor="complianceType" required error={errors.complianceType?.message}>
              <Select
                id="complianceType"
                hasError={!!errors.complianceType}
                options={COMPLIANCE_TYPES.map((c) => ({ value: c, label: c }))}
                placeholder="Select compliance"
                {...register('complianceType')}
              />
            </FormField>
          </div>
        </SectionCard>

        <SectionCard title="Packing details">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Packing date" htmlFor="date" required error={errors.date?.message}>
              <DatePicker id="date" hasError={!!errors.date} {...register('date')} />
            </FormField>
            <FormField label="Slip number" htmlFor="slipNo" required error={errors.slipNo?.message}>
              <TextInput id="slipNo" hasError={!!errors.slipNo} {...register('slipNo')} />
            </FormField>
            <FormField label="Total weight" htmlFor="totalWeightKg" required error={errors.totalWeightKg?.message}>
              <NumberInput id="totalWeightKg" unit="kg" hasError={!!errors.totalWeightKg} {...register('totalWeightKg', { valueAsNumber: true })} />
            </FormField>
            <FormField label="Actual rejection" htmlFor="actualRejectionKg" required error={errors.actualRejectionKg?.message}>
              <NumberInput id="actualRejectionKg" unit="kg" hasError={!!errors.actualRejectionKg} {...register('actualRejectionKg', { valueAsNumber: true })} />
            </FormField>
            <FormField label="Number of boxes" htmlFor="numBoxes" required error={errors.numBoxes?.message}>
              <NumberInput id="numBoxes" hasError={!!errors.numBoxes} {...register('numBoxes', { valueAsNumber: true })} />
            </FormField>
            <FormField label="Number of pallets" htmlFor="numPallets" required error={errors.numPallets?.message}>
              <NumberInput id="numPallets" hasError={!!errors.numPallets} {...register('numPallets', { valueAsNumber: true })} />
            </FormField>
          </div>

          {contractRejectionKgPreview !== null && netWeightKgPreview !== null && (
            <p className="text-sm text-gray-600">
              Contract rejection reference: {contractRejectionKgPreview} kg · Net weight: {netWeightKgPreview} kg
            </p>
          )}
          {exceedsContractRejection && (
            <Alert variant="warning" title="Actual rejection is higher than the contract's agreed percentage">
              Contract allows {harvestInfo.contractRejectionPercent}%, this packing run is at {actualRejectionPctPreview}%.
            </Alert>
          )}
        </SectionCard>

        <button
          type="submit"
          disabled={isSubmitting}
          className="min-h-12 rounded-lg bg-brand-700 text-base font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
        >
          {isSubmitting ? 'Saving...' : 'Save packing run'}
        </button>
      </form>
    </>
  )
}
