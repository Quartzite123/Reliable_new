import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

type AlertVariant = 'info' | 'warning' | 'error' | 'success'

const VARIANT_STYLES: Record<AlertVariant, string> = {
  info: 'bg-blue-50 border-blue-200 text-blue-900',
  warning: 'bg-amber-50 border-amber-200 text-amber-900',
  error: 'bg-red-50 border-red-200 text-red-900',
  success: 'bg-brand-50 border-brand-200 text-brand-900',
}

interface AlertProps {
  variant?: AlertVariant
  title?: string
  children: ReactNode
}

/** Inline banner for warnings/errors within a page (not a toast) — e.g. missing bank details. */
export function Alert({ variant = 'info', title, children }: AlertProps) {
  return (
    <div role="alert" className={cn('rounded-xl border px-4 py-3', VARIANT_STYLES[variant])}>
      {title && <p className="mb-1 font-semibold">{title}</p>}
      <div className="text-sm leading-relaxed">{children}</div>
    </div>
  )
}
