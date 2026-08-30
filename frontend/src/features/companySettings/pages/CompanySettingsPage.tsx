import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionCard } from '@/components/layout/SectionCard'
import { FormField } from '@/components/forms/FormField'
import { TextInput } from '@/components/forms/TextInput'
import { Alert } from '@/components/feedback/Alert'
import { LoadingState } from '@/components/data/LoadingState'
import { ErrorState } from '@/components/data/ErrorState'
import { useToast } from '@/app/ToastContext'
import { toFriendlyMessage } from '@/utils/errorMessages'
import { useCompanySettings, useUpdateCompanySettings } from '../hooks'
import { companySettingsSchema, type CompanySettingsFormValues } from '../schema'

/**
 * The single place GGN and letterhead details are edited — every other
 * screen (Packaging, Purchase Orders) only ever reads from here, never
 * hardcodes these values (CLAUDE.md §12).
 */
export function CompanySettingsPage() {
  const { data: settings, isLoading, isError, error, refetch } = useCompanySettings()
  const { showToast } = useToast()
  const updateSettings = useUpdateCompanySettings()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CompanySettingsFormValues>({ resolver: zodResolver(companySettingsSchema) })

  useEffect(() => {
    if (settings) {
      reset({
        companyName: settings.companyName,
        companyAddress: settings.companyAddress,
        companyPhone: settings.companyPhone,
        companyGstNumber: settings.companyGstNumber,
        companyEmail: settings.companyEmail,
        ggnNumber: settings.ggnNumber,
      })
    }
  }, [settings, reset])

  const onSubmit = async (values: CompanySettingsFormValues) => {
    try {
      await updateSettings.mutateAsync(values)
      showToast('Company settings updated.', 'success')
    } catch (error) {
      showToast(toFriendlyMessage(error), 'error')
    }
  }

  if (isLoading) return <LoadingState rows={4} />
  if (isError) return <ErrorState error={error} onRetry={() => refetch()} />

  return (
    <>
      <PageHeader title="Company Settings" description="GGN number and letterhead details used across Packaging and Purchase Orders." />
      <Alert variant="info">Changes here take effect immediately on every screen that shows the company letterhead or GGN.</Alert>
      <SectionCard>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Company name" htmlFor="companyName" required error={errors.companyName?.message}>
              <TextInput id="companyName" hasError={!!errors.companyName} {...register('companyName')} />
            </FormField>
            <FormField label="GGN number" htmlFor="ggnNumber" required error={errors.ggnNumber?.message}>
              <TextInput id="ggnNumber" hasError={!!errors.ggnNumber} {...register('ggnNumber')} />
            </FormField>
            <FormField label="GST number" htmlFor="companyGstNumber" required error={errors.companyGstNumber?.message}>
              <TextInput id="companyGstNumber" hasError={!!errors.companyGstNumber} {...register('companyGstNumber')} />
            </FormField>
            <FormField label="Phone" htmlFor="companyPhone" required error={errors.companyPhone?.message}>
              <TextInput id="companyPhone" hasError={!!errors.companyPhone} {...register('companyPhone')} />
            </FormField>
            <FormField label="Email" htmlFor="companyEmail" required error={errors.companyEmail?.message}>
              <TextInput id="companyEmail" hasError={!!errors.companyEmail} {...register('companyEmail')} />
            </FormField>
          </div>
          <FormField label="Address" htmlFor="companyAddress" required error={errors.companyAddress?.message}>
            <TextInput id="companyAddress" hasError={!!errors.companyAddress} {...register('companyAddress')} />
          </FormField>

          <button
            type="submit"
            disabled={isSubmitting}
            className="min-h-12 self-start rounded-lg bg-brand-700 px-6 text-base font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
          >
            {isSubmitting ? 'Saving...' : 'Save settings'}
          </button>
        </form>
      </SectionCard>
    </>
  )
}
