import { toFriendlyMessage } from '@/utils/errorMessages'

interface ErrorStateProps {
  error: unknown
  onRetry?: () => void
}

export function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-xl border-2 border-red-200 bg-red-50 px-6 py-10 text-center">
      <p className="text-base font-semibold text-red-900">{toFriendlyMessage(error)}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="min-h-11 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Try again
        </button>
      )}
    </div>
  )
}
