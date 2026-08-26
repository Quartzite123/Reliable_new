import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionCard } from '@/components/layout/SectionCard'
import { EmptyState } from '@/components/data/EmptyState'
import { LoadingState } from '@/components/data/LoadingState'
import { FormField } from '@/components/forms/FormField'
import { TextInput } from '@/components/forms/TextInput'
import { NumberInput } from '@/components/forms/NumberInput'
import { Textarea } from '@/components/forms/Textarea'
import { useToast } from '@/app/ToastContext'
import { toFriendlyMessage } from '@/utils/errorMessages'
import type { EntityId } from '@/types/common'
import { useCreateGoodsReceiving, useEligibleTripsForGoodsReceiving } from '../hooks'
import { goodsReceivingSchema, type GoodsReceivingFormValues } from '../schema'

export function GoodsReceivingNewPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const vehicleTripIdParam = searchParams.get('vehicleTripId')
  const vehicleTripId = vehicleTripIdParam ? Number(vehicleTripIdParam) : undefined

  if (vehicleTripId === undefined) {
    return <EligibleTripPicker onPick={(id) => setSearchParams({ vehicleTripId: String(id) })} />
  }

  return <GoodsReceivingForm vehicleTripId={vehicleTripId} onDone={() => navigate('/goods-receiving')} />
}

function EligibleTripPicker({ onPick }: { onPick: (vehicleTripId: EntityId) => void }) {
  const { data, isLoading } = useEligibleTripsForGoodsReceiving()

  return (
    <>
      <PageHeader title="Confirm Goods Receipt" description="Only weighed trips that haven't been confirmed yet are shown." />
      {isLoading && <LoadingState rows={3} />}
      {!isLoading && (data?.length ?? 0) === 0 && <EmptyState title="Nothing waiting to be confirmed" />}
      {!isLoading && data && data.length > 0 && (
        <ul className="flex flex-col gap-2">
          {data.map((row) => (
            <li key={row.vehicleTripId}>
              <button
                type="button"
                onClick={() => onPick(row.vehicleTripId)}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left hover:border-brand-400 hover:bg-brand-50"
              >
                <div>
                  <p className="font-semibold text-gray-900">{row.vehicleNo}</p>
                  <p className="text-sm text-gray-500">
                    {row.farmerName} — {row.plotNumber} · Harvested {row.harvestDate}
                  </p>
                </div>
                <span className="text-sm font-semibold text-brand-700">Confirm receipt</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

function GoodsReceivingForm({ vehicleTripId, onDone }: { vehicleTripId: EntityId; onDone: () => void }) {
  const { showToast } = useToast()
  const createGoodsReceiving = useCreateGoodsReceiving()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<GoodsReceivingFormValues>({ resolver: zodResolver(goodsReceivingSchema) })

  const onSubmit = async (values: GoodsReceivingFormValues) => {
    try {
      await createGoodsReceiving.mutateAsync({ vehicleTripId, ...values })
      showToast('Goods receipt confirmed.', 'success')
      onDone()
    } catch (error) {
      showToast(toFriendlyMessage(error), 'error')
    }
  }

  return (
    <>
      <PageHeader title="Confirm Goods Receipt" />
      <SectionCard>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Received crates" htmlFor="receivedCrates" required error={errors.receivedCrates?.message}>
              <NumberInput id="receivedCrates" hasError={!!errors.receivedCrates} {...register('receivedCrates', { valueAsNumber: true })} />
            </FormField>
            <FormField label="Received weight" htmlFor="receivedWeightKg" required error={errors.receivedWeightKg?.message}>
              <NumberInput id="receivedWeightKg" unit="kg" hasError={!!errors.receivedWeightKg} {...register('receivedWeightKg', { valueAsNumber: true })} />
            </FormField>
            <FormField label="Accepted weight" htmlFor="acceptedWeightKg" required error={errors.acceptedWeightKg?.message}>
              <NumberInput id="acceptedWeightKg" unit="kg" hasError={!!errors.acceptedWeightKg} {...register('acceptedWeightKg', { valueAsNumber: true })} />
            </FormField>
            <FormField label="Rejected weight" htmlFor="rejectedWeightKg" required error={errors.rejectedWeightKg?.message}>
              <NumberInput id="rejectedWeightKg" unit="kg" hasError={!!errors.rejectedWeightKg} {...register('rejectedWeightKg', { valueAsNumber: true })} />
            </FormField>
            <FormField label="Warehouse location" htmlFor="warehouseLocation" required error={errors.warehouseLocation?.message}>
              <TextInput id="warehouseLocation" hasError={!!errors.warehouseLocation} {...register('warehouseLocation')} />
            </FormField>
          </div>
          <FormField label="Notes" htmlFor="notes">
            <Textarea id="notes" {...register('notes')} />
          </FormField>

          <button
            type="submit"
            disabled={isSubmitting}
            className="min-h-12 rounded-lg bg-brand-700 text-base font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
          >
            {isSubmitting ? 'Saving...' : 'Confirm receipt'}
          </button>
        </form>
      </SectionCard>
    </>
  )
}
