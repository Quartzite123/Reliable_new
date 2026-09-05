import type { RecordStatus } from '@/types/common'
import { cn } from '@/utils/cn'

/**
 * Status is the primary information on most screens in this app, so it
 * gets its own colour scale rather than borrowing from the brand ramp.
 *
 * Previously `passed`, `approved` and `completed` were `bg-brand-100
 * text-brand-800` — the same green as the primary button, the active nav
 * item and the KPI icons, so a "Passed" badge read as decoration rather
 * than as a state. The status tokens in tokens.css are deliberately
 * separate from `brand-*`.
 *
 * Each badge also carries a filled dot. Colour alone fails for the ~8% of
 * men with a colour-vision deficiency, and fails again for everyone on a
 * cheap screen in direct sunlight; the dot plus the always-present text
 * label means the colour is a third signal, not the only one.
 */
const STATUS_STYLES: Record<RecordStatus, string> = {
  not_started: 'bg-status-notstarted-bg text-status-notstarted',
  in_progress: 'bg-status-progress-bg text-status-progress',
  submitted: 'bg-status-submitted-bg text-status-submitted',
  passed: 'bg-status-passed-bg text-status-passed',
  failed: 'bg-status-failed-bg text-status-failed',
  approved: 'bg-status-passed-bg text-status-passed',
  rejected: 'bg-status-failed-bg text-status-failed',
  completed: 'bg-status-passed-bg text-status-passed',
  blocked: 'bg-status-blocked-bg text-status-blocked',
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
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap',
        STATUS_STYLES[status],
      )}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" aria-hidden />
      {STATUS_LABELS[status]}
    </span>
  )
}
