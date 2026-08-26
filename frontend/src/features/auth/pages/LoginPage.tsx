import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/app/AuthContext'
import { FormField } from '@/components/forms/FormField'
import { TextInput } from '@/components/forms/TextInput'
import { Alert } from '@/components/feedback/Alert'
import { LogoMark } from '@/components/icons/Logo'
import { toFriendlyMessage } from '@/utils/errorMessages'
import { loginSchema, type LoginFormValues } from '../schema'

/**
 * Split-screen layout: the login experience lives entirely in the left
 * panel (no floating card over the whole page); the right panel shows the
 * plant/soil photo full-bleed with no dark overlay. Right panel hides below
 * `md` so phones get the login form at 100% width instead of a squeezed
 * split (prompt: "mobile ... login should occupy 100% width").
 */
export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) })

  const onSubmit = async (values: LoginFormValues) => {
    setSubmitError(null)
    try {
      await login(values)
      // Always land on Home, never a redirect-back-to-previous-page target: since the
      // same device/browser may hand off between different workers' logins, honoring a
      // leftover `location.state.from` from ProtectedRoute risks dropping the next
      // person who signs in onto whatever page the last session was viewing.
      navigate('/home', { replace: true })
    } catch (error) {
      setSubmitError(toFriendlyMessage(error))
    }
  }

  return (
    <div className="flex min-h-screen bg-white">
      <div className="flex w-full flex-col justify-center px-6 py-10 sm:px-10 md:w-[45%] lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-10 flex items-center gap-3">
            <LogoMark className="h-11 w-11 shrink-0" />
            <div className="leading-tight">
              <p className="text-lg font-bold text-gray-900">Reliable Fresh</p>
              <p className="text-xs font-medium text-brand-700">Freshness You Can Rely On</p>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 sm:text-[28px]">Welcome Back</h1>
          <p className="mt-1.5 text-sm text-gray-500">Sign in to your account</p>

          <form className="mt-8 flex flex-col gap-5" onSubmit={handleSubmit(onSubmit)} noValidate>
            {submitError && <Alert variant="error">{submitError}</Alert>}

            <FormField label="Email" htmlFor="email" required error={errors.email?.message}>
              <TextInput id="email" autoComplete="username" hasError={!!errors.email} {...register('email')} />
            </FormField>

            <FormField label="Password" htmlFor="password" required error={errors.password?.message}>
              <TextInput
                id="password"
                type="password"
                autoComplete="current-password"
                hasError={!!errors.password}
                {...register('password')}
              />
            </FormField>

            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-12 rounded-lg bg-brand-700 text-base font-semibold text-white transition-colors hover:bg-brand-800 disabled:opacity-60"
            >
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>

            <Link to="/forgot-password" className="text-center text-sm font-medium text-brand-700 hover:text-brand-800 hover:underline">
              Forgot your password?
            </Link>
          </form>
        </div>
      </div>

      <div
        className="hidden bg-cover bg-center md:block md:w-[55%]"
        style={{ backgroundImage: "url('/login.jpg')" }}
        aria-hidden
      />
    </div>
  )
}
