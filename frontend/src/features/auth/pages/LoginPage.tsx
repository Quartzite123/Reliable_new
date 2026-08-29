import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/app/AuthContext'
import { FormField } from '@/components/forms/FormField'
import { Alert } from '@/components/feedback/Alert'
import { ArrowRightIcon, EyeIcon, EyeOffIcon, LockIcon, MailIcon } from '@/components/icons/Icon'
import { cn } from '@/utils/cn'
import { toFriendlyMessage } from '@/utils/errorMessages'
import { loginSchema, type LoginFormValues } from '../schema'

function LeafGlyph(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={props.className} aria-hidden>
      <path d="M4 20c8-1 14-7 14-16C10 5 4 11 4 20Z" fill="#20A85A" />
    </svg>
  )
}

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) })

  const onSubmit = async (values: LoginFormValues) => {
    setSubmitError(null)
    try {
      const user = await login(values)
      navigate(user.phases.includes('admin') ? '/admin/dashboard' : '/home', { replace: true })
    } catch (error) {
      setSubmitError(toFriendlyMessage(error))
    }
  }

  return (
    <div className="relative flex min-h-screen">
      <div
        className="relative bg-cover bg-center md:w-1/2"
        style={{ backgroundImage: "url('/farm-crate.png')" }}
        aria-hidden
      >
        <div className="flex h-full flex-col justify-start px-10 pt-20 lg:px-16 lg:pt-28">
          <h2 className="max-w-md text-4xl font-extrabold leading-tight text-brand-900 lg:text-5xl">
            Connecting Farms.
            <br />
            Delivering Freshness.
          </h2>

          <div className="mt-5 flex items-center gap-3">
            <span className="h-px w-10 bg-brand-800" />
            <LeafGlyph className="h-4 w-4" />
          </div>

          <p className="mt-5 max-w-sm text-base leading-relaxed text-gray-800">
            Reliable Fresh ERP helps you manage procurement, quality, inventory, and deliveries
            efficiently — from farm to customer.
          </p>
        </div>
      </div>

      <div className="relative z-10 flex w-full flex-1 flex-col items-center justify-center px-4 py-10 sm:px-6 md:w-1/2 md:px-10 lg:px-16">
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
          <div className="mx-auto flex w-full flex-col items-center">
            <img src="/logo.jpeg" alt="Reliable Fresh — Quality With Traceability" className="h-16 w-auto object-contain md:h-20" />

            <h1 className="mt-6 text-center text-2xl font-bold text-gray-900 md:text-3xl">Welcome Back!</h1>
            <p className="mt-2 text-center text-sm text-gray-500">Sign in to your Reliable Fresh ERP account</p>

            <form className="mt-8 flex w-full flex-col gap-5" onSubmit={handleSubmit(onSubmit)} noValidate>
              {submitError && <Alert variant="error">{submitError}</Alert>}

              <FormField label="Email" htmlFor="email" required error={errors.email?.message}>
                <div className="relative">
                  <MailIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    id="email"
                    type="text"
                    autoComplete="username"
                    placeholder="Email Address"
                    aria-invalid={!!errors.email}
                    className={cn(
                      'min-h-12 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-3 text-base text-gray-900 focus:border-brand-600',
                      errors.email && 'border-red-500 focus:border-red-600',
                    )}
                    {...register('email')}
                  />
                </div>
              </FormField>

              <FormField label="Password" htmlFor="password" required error={errors.password?.message}>
                <div className="relative">
                  <LockIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Password"
                    aria-invalid={!!errors.password}
                    className={cn(
                      'min-h-12 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-10 text-base text-gray-900 focus:border-brand-600',
                      errors.password && 'border-red-500 focus:border-red-600',
                    )}
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide typed characters' : 'Show typed characters'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                  </button>
                </div>
              </FormField>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 accent-blue-600"
                  />
                  Remember me
                </label>
                <Link to="/forgot-password" className="text-sm font-medium text-brand-700 hover:text-brand-800 hover:underline">
                  Forgot Password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-1 flex min-h-12 items-center justify-center gap-2 rounded-full bg-brand-700 text-base font-semibold text-white transition-colors hover:bg-brand-800 disabled:opacity-60"
              >
                {isSubmitting ? 'Signing in...' : 'Login'}
                {!isSubmitting && <ArrowRightIcon className="h-5 w-5" />}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}