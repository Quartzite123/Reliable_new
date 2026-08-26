import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { FormField } from '@/components/forms/FormField'
import { NumberInput } from '@/components/forms/NumberInput'
import { DatePicker } from '@/components/forms/DatePicker'
import { Textarea } from '@/components/forms/Textarea'
import { useToast } from '@/app/ToastContext'
import { toFriendlyMessage } from '@/utils/errorMessages'
import { seasonFormSchema, type SeasonFormValues } from '../schema'
import { useCreateSeason, useUpdateSeason } from '../hooks'
import type { Season } from '../types'

interface SeasonFormProps {
  season?: Season
  onDone: () => void
}

/** Shared by the "Start New Season" flow (Admin Dashboard + Seasons page) and season editing. */
export function SeasonForm({ season, onDone }: SeasonFormProps) {
  const { showToast } = useToast()
  const createSeason = useCreateSeason()
  const updateSeason = useUpdateSeason()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SeasonFormValues>({
    resolver: zodResolver(seasonFormSchema),
    defaultValues: season
      ? { year: season.year, startDate: season.startDate, endDate: season.endDate, notes: season.notes ?? '' }
      : { year: new Date().getFullYear(), startDate: '', endDate: '', notes: '' },
  })

  const startDate = watch('startDate')

  const onSubmit = async (values: SeasonFormValues) => {
    try {
      if (season) {
        await updateSeason.mutateAsync({ id: season.id, ...values })
        showToast('Season updated.', 'success')
      } else {
        await createSeason.mutateAsync(values)
        showToast('New season created.', 'success')
      }
      onDone()
    } catch (error) {
      showToast(toFriendlyMessage(error), 'error')
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FormField label="Season year" htmlFor="year" required error={errors.year?.message}>
          <NumberInput id="year" hasError={!!errors.year} {...register('year', { valueAsNumber: true })} />
        </FormField>
        <FormField label="Season start date" htmlFor="startDate" required error={errors.startDate?.message}>
          <DatePicker id="startDate" hasError={!!errors.startDate} {...register('startDate')} />
        </FormField>
        <FormField label="Season end date" htmlFor="endDate" required error={errors.endDate?.message}>
          <DatePicker id="endDate" hasError={!!errors.endDate} min={startDate || undefined} {...register('endDate')} />
        </FormField>
      </div>
      <FormField label="Notes" htmlFor="notes" hint="Optional">
        <Textarea id="notes" {...register('notes')} />
      </FormField>
      <button
        type="submit"
        disabled={isSubmitting}
        className="min-h-12 self-start rounded-lg bg-brand-700 px-6 text-base font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
      >
        {isSubmitting ? 'Saving...' : season ? 'Save season' : 'Create season'}
      </button>
    </form>
  )
}
