import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionCard } from '@/components/layout/SectionCard'
import { FormField } from '@/components/forms/FormField'
import { NumberInput } from '@/components/forms/NumberInput'
import { DatePicker } from '@/components/forms/DatePicker'
import { TimePicker } from '@/components/forms/TimePicker'
import { CheckboxGroup } from '@/components/forms/CheckboxGroup'
import { LoadingState } from '@/components/data/LoadingState'
import { EmptyState } from '@/components/data/EmptyState'
import { useToast } from '@/app/ToastContext'
import { toFriendlyMessage } from '@/utils/errorMessages'
import { useCreatePreCooling, useEligiblePalletsForPreCooling } from '../hooks'
import { preCoolingInSchema, type PreCoolingInFormValues } from '../schema'

/** Batch entry: one in-time/in-temp reading can cover several pallets entering cold storage together (prompt.md §18). */
export function PreCoolingNewPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { data: eligiblePallets, isLoading } = useEligiblePalletsForPreCooling()
  const createPreCooling = useCreatePreCooling()
  const [selectedPalletIds, setSelectedPalletIds] = useState<string[]>([])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PreCoolingInFormValues>({ resolver: zodResolver(preCoolingInSchema) })

  const onSubmit = async (values: PreCoolingInFormValues) => {
    if (selectedPalletIds.length === 0) {
      showToast('Select at least one pallet.', 'error')
      return
    }
    try {
      await createPreCooling.mutateAsync({ ...values, palletIds: selectedPalletIds.map(Number) })
      showToast('Pre-cooling entry logged. Add the out-time later to complete it.', 'success')
      navigate('/pre-cooling')
    } catch (error) {
      showToast(toFriendlyMessage(error), 'error')
    }
  }

  if (isLoading) return <LoadingState rows={4} />

  return (
    <>
      <PageHeader title="Pre-Cooling — Log In-Time" description="You can complete the out-time later." />

      <SectionCard title="Pallets entering cold storage">
        {eligiblePallets && eligiblePallets.length === 0 && <EmptyState title="No pallets are waiting for pre-cooling" />}
        {eligiblePallets && eligiblePallets.length > 0 && (
          <CheckboxGroup
            name="pallets"
            values={selectedPalletIds}
            onChange={setSelectedPalletIds}
            options={eligiblePallets.map((p) => ({ value: String(p.palletId), label: `${p.palletLabel} — ${p.totalBoxes} boxes` }))}
          />
        )}
      </SectionCard>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <SectionCard title="Reading">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField label="Date" htmlFor="date" required error={errors.date?.message}>
              <DatePicker id="date" hasError={!!errors.date} {...register('date')} />
            </FormField>
            <FormField label="In-time" htmlFor="inTime" required error={errors.inTime?.message}>
              <TimePicker id="inTime" hasError={!!errors.inTime} {...register('inTime')} />
            </FormField>
            <FormField label="In berry temperature" htmlFor="inBerryTemp" required error={errors.inBerryTemp?.message}>
              <NumberInput id="inBerryTemp" unit="°C" hasError={!!errors.inBerryTemp} {...register('inBerryTemp', { valueAsNumber: true })} />
            </FormField>
          </div>
        </SectionCard>

        <button
          type="submit"
          disabled={isSubmitting}
          className="min-h-12 rounded-lg bg-brand-700 text-base font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
        >
          {isSubmitting ? 'Saving...' : 'Save in-time entry'}
        </button>
      </form>
    </>
  )
}
