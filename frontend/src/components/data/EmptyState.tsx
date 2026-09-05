import type { ReactNode } from 'react'
import { InboxEmptyIcon } from '@/components/icons/Icon'

interface EmptyStateProps {
  title: string
  description?: string
  action?: ReactNode
}

/**
 * An empty screen is an invitation to act, not a dead end. The dashed
 * border reads as "this space is waiting to be filled" rather than as a
 * finished panel, which is what the previous solid gradient block looked
 * like.
 */
export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="bg-gradient-soft flex flex-col items-center gap-3 rounded-xl border border-dashed border-gray-300 px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-brand-600 shadow-card">
        <InboxEmptyIcon className="h-6 w-6" />
      </div>
      <p className="text-base font-semibold text-gray-800">{title}</p>
      {description && <p className="max-w-sm text-sm text-gray-600">{description}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}
