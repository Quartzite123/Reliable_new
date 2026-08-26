import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionCard } from '@/components/layout/SectionCard'
import { FormField } from '@/components/forms/FormField'
import { NumberInput } from '@/components/forms/NumberInput'
import { Select } from '@/components/forms/Select'
import { DatePicker } from '@/components/forms/DatePicker'
import { Textarea } from '@/components/forms/Textarea'
import { LoadingState } from '@/components/data/LoadingState'
import { EmptyState } from '@/components/data/EmptyState'
import { Alert } from '@/components/feedback/Alert'
import { useToast } from '@/app/ToastContext'
import { toFriendlyMessage } from '@/utils/errorMessages'
import type { EntityId } from '@/types/common'
import { useAvailableLots, useCreatePallet } from '../hooks'
import { palletSchema, type PalletFormValues } from '../schema'
import { PALLET_TYPES } from '../types'

export function PalletisationNewPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { data: availableLots, isLoading } = useAvailableLots()
  const createPallet = useCreatePallet()

  const [selectedBoxes, setSelectedBoxes] = useState<Record<EntityId, number>>({})

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PalletFormValues>({ resolver: zodResolver(palletSchema) })

  const toggleLot = (packagingRecordId: EntityId, remaining: number) => {
    setSelectedBoxes((current) => {
      const next = { ...current }
      if (packagingRecordId in next) {
        delete next[packagingRecordId]
      } else {
        next[packagingRecordId] = remaining
      }
      return next
    })
  }

  const setBoxCount = (packagingRecordId: EntityId, value: number) => {
    setSelectedBoxes((current) => ({ ...current, [packagingRecordId]: value }))
  }

  const totalBoxes = Object.values(selectedBoxes).reduce((sum, n) => sum + n, 0)

  const onSubmit = async (values: PalletFormValues) => {
    const lots = Object.entries(selectedBoxes)
      .filter(([, numBoxes]) => numBoxes > 0)
      .map(([packagingRecordId, numBoxes]) => ({ packagingRecordId: Number(packagingRecordId), numBoxes }))

    if (lots.length === 0) {
      showToast('Select at least one lot.', 'error')
      return
    }

    try {
      const pallet = await createPallet.mutateAsync({ ...values, lots })
      showToast('Pallet created.', 'success')
      navigate(`/palletisation/${pallet.id}`)
    } catch (error) {
      showToast(toFriendlyMessage(error), 'error')
    }
  }

  if (isLoading) return <LoadingState rows={4} />

  return (
    <>
      <PageHeader title="New Pallet" description="A pallet can combine boxes from multiple lots." />

      <SectionCard title="Select lots">
        {availableLots && availableLots.length === 0 && (
          <EmptyState title="No packed boxes are waiting to be palletised" />
        )}
        {availableLots && availableLots.length > 0 && (
          <ul className="flex flex-col gap-2">
            {availableLots.map((lot) => {
              const checked = lot.packagingRecordId in selectedBoxes
              return (
                <li key={lot.packagingRecordId} className="rounded-lg border border-gray-200 p-3">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      className="h-5 w-5"
                      checked={checked}
                      onChange={() => toggleLot(lot.packagingRecordId, lot.remainingBoxes)}
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        Lot {lot.lotId} — {lot.farmerName}
                      </p>
                      <p className="text-sm text-gray-500">
                        {lot.customerName} · {lot.packSize} · {lot.remainingBoxes} boxes available
                      </p>
                    </div>
                  </label>
                  {checked && (
                    <div className="mt-2 max-w-40">
                      <FormField label="Boxes to include" htmlFor={`boxes-${lot.packagingRecordId}`}>
                        <NumberInput
                          id={`boxes-${lot.packagingRecordId}`}
                          value={selectedBoxes[lot.packagingRecordId]}
                          max={lot.remainingBoxes}
                          min={1}
                          onChange={(e) => setBoxCount(lot.packagingRecordId, Number(e.target.value))}
                        />
                      </FormField>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
        {totalBoxes > 0 && <p className="mt-3 text-sm font-medium text-gray-700">Total boxes selected: {totalBoxes}</p>}
      </SectionCard>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <SectionCard title="Pallet details">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Date" htmlFor="date" required error={errors.date?.message}>
              <DatePicker id="date" hasError={!!errors.date} {...register('date')} />
            </FormField>
            <FormField label="Pallet type" htmlFor="palletType" required error={errors.palletType?.message}>
              <Select
                id="palletType"
                hasError={!!errors.palletType}
                options={PALLET_TYPES.map((t) => ({ value: t, label: t }))}
                placeholder="Select type"
                {...register('palletType')}
              />
            </FormField>
          </div>
          <FormField label="Notes" htmlFor="notes">
            <Textarea id="notes" {...register('notes')} />
          </FormField>
        </SectionCard>

        <Alert variant="info">The Pallet ID shown after saving is a temporary placeholder — the final numbering format is still pending business confirmation.</Alert>

        <button
          type="submit"
          disabled={isSubmitting}
          className="min-h-12 rounded-lg bg-brand-700 text-base font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
        >
          {isSubmitting ? 'Saving...' : 'Create pallet'}
        </button>
      </form>
    </>
  )
}
