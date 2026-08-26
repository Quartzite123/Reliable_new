import type { ReactNode } from 'react'

interface ConfirmationDialogProps {
  open: boolean
  title: string
  description?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/** Blocking confirm/cancel dialog for actions that shouldn't happen by accident. */
export function ConfirmationDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
        <h2 id="confirm-dialog-title" className="text-lg font-semibold text-gray-900">
          {title}
        </h2>
        {description && <div className="mt-2 text-sm text-gray-600">{description}</div>}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 rounded-lg border border-gray-300 px-4 py-2 text-base font-medium text-gray-700 hover:bg-gray-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={
              destructive
                ? 'min-h-11 rounded-lg bg-red-600 px-4 py-2 text-base font-medium text-white hover:bg-red-700'
                : 'min-h-11 rounded-lg bg-brand-700 px-4 py-2 text-base font-medium text-white hover:bg-brand-800'
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
