import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
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
      <path d="M4 20c8-1 14-7 14-16C10 5 4 11 4 20Z" fill="currentColor" />
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

  const fieldClass = (hasError: boolean, extraPadding: string) =>
    cn(
      'min-h-12 w-full rounded-lg border border-gray-300 bg-white text-base text-gray-900 placeholder:text-gray-400',
      'focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 focus:outline-none',
      extraPadding,
      hasError && 'border-status-failed focus:border-status-failed focus:ring-status-failed/20',
    )

  return (
    // Stacks on phones. Previously this was a bare `flex`, so the photo
    // column and the form column sat side by side even at 375px, which is
    // what squeezed the fields and wrapped the hero text mid-word.
    <div className="flex min-h-screen flex-col bg-gray-50 md:flex-row">
      {/*
        Hero panel — hidden below `md`. On a phone the form is the only
        thing that matters, and a half-width decorative photo was actively
        in the way.

        The source photograph is soft in the mid-ground and cannot be
        re-shot, so rather than fight it: it is pushed slightly further out
        of focus, darkened, and covered with a forest scrim. That turns an
        image that looked accidentally blurry into a deliberate backdrop,
        and it means the headline's legibility no longer depends on the
        photo at all.
      */}
      <div className="relative hidden overflow-hidden md:flex md:w-1/2">
        <div
          className="absolute inset-0 scale-105 bg-cover bg-center blur-[2px]"
          style={{ backgroundImage: "url('/farm-crate.webp')" }}
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-gradient-to-br from-brand-900/90 via-brand-800/75 to-brand-700/60"
          aria-hidden
        />

        <div className="relative flex h-full flex-col justify-center px-10 py-20 lg:px-16">
          <h2 className="max-w-md text-4xl leading-tight font-bold text-white lg:text-5xl">
            Connecting Farms.
            <br />
            Delivering Freshness.
          </h2>

          <div className="mt-6 flex items-center gap-3">
            <span className="h-px w-10 bg-lime-300" />
            <LeafGlyph className="h-4 w-4 text-lime-300" />
          </div>

          <p className="mt-6 max-w-sm text-base leading-relaxed text-brand-50">
            Track every consignment from the plot to the container — quality checks, weights,
            packing and cold chain, in one record.
          </p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex w-full flex-1 flex-col items-center justify-center px-4 py-8 sm:px-6 md:w-1/2 md:px-10 lg:px-16">
        <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-card-hover sm:p-8">
          <div className="flex w-full flex-col items-center">
            <img
              src="/logo.jpeg"
              alt="Reliable Fresh — Quality With Traceability"
              className="h-14 w-auto object-contain sm:h-16 md:h-20"
            />

            <h1 className="mt-5 text-center text-2xl font-bold text-gray-900 md:text-3xl">Welcome back</h1>
            <p className="mt-2 text-center text-sm text-gray-600">Sign in to your Reliable Fresh account</p>

            <form className="mt-7 flex w-full flex-col gap-5" onSubmit={handleSubmit(onSubmit)} noValidate>
              {submitError && <Alert variant="error">{submitError}</Alert>}

              <FormField label="Email" htmlFor="email" required error={errors.email?.message}>
                <div className="relative">
                  <MailIcon className="pointer-events-none absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    id="email"
                    type="text"
                    autoComplete="username"
                    placeholder="Email address"
                    aria-invalid={!!errors.email}
                    className={fieldClass(!!errors.email, 'pr-3 pl-10')}
                    {...register('email')}
                  />
                </div>
              </FormField>

              <FormField label="Password" htmlFor="password" required error={errors.password?.message}>
                <div className="relative">
                  <LockIcon className="pointer-events-none absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Password"
                    aria-invalid={!!errors.password}
                    className={fieldClass(!!errors.password, 'pr-12 pl-10')}
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide typed characters' : 'Show typed characters'}
                    className="absolute top-1/2 right-1 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                  </button>
                </div>
              </FormField>

              <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-5 w-5 rounded border-gray-300 accent-brand-600"
                />
                Keep me signed in
              </label>
              {/* No "Forgot Password?" link — no self-service reset exists.
                  Admin-set passwords are permanent by design; account
                  recovery is scripts/seed_admin.py as a documented
                  break-glass procedure (2026-09-01). */}

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-1 flex min-h-12 items-center justify-center gap-2 rounded-lg bg-brand-700 text-base font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
              >
                {isSubmitting ? 'Signing in…' : 'Sign in'}
                {!isSubmitting && <ArrowRightIcon className="h-5 w-5" />}
              </button>
            </form>
          </div>
        </div>

        <p className="mt-6 max-w-sm text-center text-xs text-gray-500">
          Forgotten your password? Ask your administrator to set a new one.
        </p>
      </div>
    </div>
  )
}
