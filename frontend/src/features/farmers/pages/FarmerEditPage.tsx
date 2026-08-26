import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionCard } from '@/components/layout/SectionCard'
import { FormField } from '@/components/forms/FormField'
import { TextInput } from '@/components/forms/TextInput'
import { LoadingState } from '@/components/data/LoadingState'
import { ErrorState } from '@/components/data/ErrorState'
import { useToast } from '@/app/ToastContext'
import { toFriendlyMessage } from '@/utils/errorMessages'
import { useFarmer, useUpdateFarmer } from '../hooks'
import { farmerSchema, type FarmerFormValues } from '../schema'

export function FarmerEditPage() {
  const { id } = useParams<{ id: string }>()
  const farmerId = id ? Number(id) : undefined
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { data: farmer, isLoading, error, refetch } = useFarmer(farmerId)
  const updateFarmer = useUpdateFarmer(farmerId ?? 0)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FarmerFormValues>({ resolver: zodResolver(farmerSchema) })

  // Auto-fill on load — always editable (CLAUDE.md §4.5).
  useEffect(() => {
    if (farmer) {
      reset({ name: farmer.name, address: farmer.address, mobile: farmer.mobile })
    }
  }, [farmer, reset])

  if (isLoading) return <LoadingState rows={4} />
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />
  if (!farmer) return null

  const onSubmit = async (values: FarmerFormValues) => {
    try {
      await updateFarmer.mutateAsync({ ...values, status: farmer.status })
      showToast('Farmer details updated.', 'success')
      navigate(`/farmers/${farmer.id}`)
    } catch (error) {
      showToast(toFriendlyMessage(error), 'error')
    }
  }

  return (
    <>
      <PageHeader title={`Edit ${farmer.name}`} />
      <SectionCard>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <FormField label="Full name" htmlFor="name" required error={errors.name?.message}>
            <TextInput id="name" hasError={!!errors.name} {...register('name')} />
          </FormField>
          <FormField label="Address" htmlFor="address" required error={errors.address?.message}>
            <TextInput id="address" hasError={!!errors.address} {...register('address')} />
          </FormField>
          <FormField label="Mobile number" htmlFor="mobile" required error={errors.mobile?.message}>
            <TextInput id="mobile" inputMode="numeric" hasError={!!errors.mobile} {...register('mobile')} />
          </FormField>
          <button
            type="submit"
            disabled={isSubmitting}
            className="min-h-12 rounded-lg bg-brand-700 text-base font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
          >
            {isSubmitting ? 'Saving...' : 'Save changes'}
          </button>
        </form>
      </SectionCard>
    </>
  )
}
