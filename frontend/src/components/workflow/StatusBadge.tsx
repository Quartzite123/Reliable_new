import type { RecordStatus } from '@/types/common'
import { cn } from '@/utils/cn'

const STATUS_STYLES: Record<RecordStatus, string> = {
  not_started: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-800',
  submitted: 'bg-purple-100 text-purple-800',
  passed: 'bg-brand-100 text-brand-800',
  failed: 'bg-red-100 text-red-800',
  approved: 'bg-brand-100 text-brand-800',
  rejected: 'bg-red-100 text-red-800',
  completed: 'bg-brand-100 text-brand-800',
  blocked: 'bg-amber-100 text-amber-800',
}

const STATUS_LABELS: Record<RecordStatus, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  submitted: 'Submitted',
  passed: 'Passed',
  failed: 'Failed',
  approved: 'Approved',
  rejected: 'Rejected',
  completed: 'Completed',
  blocked: 'Blocked',
}

export function StatusBadge({ status }: { status: RecordStatus }) {
  return (
    <span
      className={cn('inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold', STATUS_STYLES[status])}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}
