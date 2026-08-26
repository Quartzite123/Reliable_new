import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { FormField } from '@/components/forms/FormField'
import { TextInput } from '@/components/forms/TextInput'
import { Alert } from '@/components/feedback/Alert'
import { toFriendlyMessage } from '@/utils/errorMessages'
import { authApi } from '../index'
import { forgotPasswordSchema, type ForgotPasswordFormValues } from '../schema'

export function ForgotPasswordPage() {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({ resolver: zodResolver(forgotPasswordSchema) })

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    setSubmitError(null)
    try {
      await authApi.forgotPassword(values)
      setSubmitted(true)
    } catch (error) {
      setSubmitError(toFriendlyMessage(error))
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">Reset your password</h1>
        <p className="mt-1 text-sm text-gray-500">
          Accounts are created by your Admin. Ask them to reset your password, or request a reset link below.
        </p>

        {submitted ? (
          <Alert variant="success" title="Request sent">
            If that email has an account, a reset link has been sent. Contact your Admin if you don't receive it.
          </Alert>
        ) : (
          <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            {submitError && <Alert variant="error">{submitError}</Alert>}

            <FormField label="Email" htmlFor="email" required error={errors.email?.message}>
              <TextInput id="email" autoComplete="username" hasError={!!errors.email} {...register('email')} />
            </FormField>

            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-12 rounded-lg bg-brand-700 text-base font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
            >
              {isSubmitting ? 'Sending...' : 'Send reset link'}
            </button>
          </form>
        )}

        <Link to="/login" className="mt-4 block text-center text-sm font-medium text-brand-700 underline">
          Back to sign in
        </Link>
      </div>
    </div>
  )
}
