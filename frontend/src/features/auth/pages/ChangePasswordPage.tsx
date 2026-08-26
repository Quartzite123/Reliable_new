import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionCard } from '@/components/layout/SectionCard'
import { FormField } from '@/components/forms/FormField'
import { TextInput } from '@/components/forms/TextInput'
import { Alert } from '@/components/feedback/Alert'
import { useToast } from '@/app/ToastContext'
import { toFriendlyMessage } from '@/utils/errorMessages'
import { authApi } from '../index'
import { changePasswordSchema, type ChangePasswordFormValues } from '../schema'

export function ChangePasswordPage() {
  const { showToast } = useToast()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormValues>({ resolver: zodResolver(changePasswordSchema) })

  const onSubmit = async (values: ChangePasswordFormValues) => {
    setSubmitError(null)
    try {
      await authApi.changePassword(values)
      showToast('Password updated.', 'success')
      reset()
    } catch (error) {
      setSubmitError(toFriendlyMessage(error))
    }
  }

  return (
    <>
      <PageHeader title="Change password" description="Update the password you use to sign in." />
      <SectionCard>
        <form className="flex max-w-sm flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          {submitError && <Alert variant="error">{submitError}</Alert>}

          <FormField label="Current password" htmlFor="currentPassword" required error={errors.currentPassword?.message}>
            <TextInput
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              hasError={!!errors.currentPassword}
              {...register('currentPassword')}
            />
          </FormField>

          <FormField label="New password" htmlFor="newPassword" required error={errors.newPassword?.message}>
            <TextInput
              id="newPassword"
              type="password"
              autoComplete="new-password"
              hasError={!!errors.newPassword}
              {...register('newPassword')}
            />
          </FormField>

          <FormField label="Confirm new password" htmlFor="confirmPassword" required error={errors.confirmPassword?.message}>
            <TextInput
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              hasError={!!errors.confirmPassword}
              {...register('confirmPassword')}
            />
          </FormField>

          <button
            type="submit"
            disabled={isSubmitting}
            className="min-h-12 rounded-lg bg-brand-700 text-base font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
          >
            {isSubmitting ? 'Saving...' : 'Update password'}
          </button>
        </form>
      </SectionCard>
    </>
  )
}
