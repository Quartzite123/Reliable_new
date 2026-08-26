import { useToast } from '@/app/ToastContext'
import { cn } from '@/utils/cn'

const VARIANT_STYLES = {
  success: 'bg-brand-700 text-white border-brand-800',
  error: 'bg-red-600 text-white border-red-700',
  info: 'bg-gray-800 text-white border-gray-900',
}

/** Fixed toast stack, rendered once near the app root. */
export function ToastViewport() {
  const { toasts, dismissToast } = useToast()

  if (toasts.length === 0) return null

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-end"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={cn(
            'flex w-full max-w-sm items-start justify-between gap-3 rounded-xl border px-4 py-3 shadow-card-hover',
            VARIANT_STYLES[toast.variant],
          )}
        >
          <p className="text-sm font-medium">{toast.message}</p>
          <button
            type="button"
            onClick={() => dismissToast(toast.id)}
            aria-label="Dismiss notification"
            className="shrink-0 rounded px-1 text-lg leading-none opacity-80 hover:opacity-100"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
