import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { RecordStatus } from '@/types/common'
import { StatusBadge } from './StatusBadge'

interface TaskCardProps {
  title: string
  subtitle?: string
  status: RecordStatus
  currentStage?: string
  continueHref?: string
  detailsHref?: string
  historyHref?: string
  extra?: ReactNode
}

/** The home-screen "Farmer / Plot / Current stage / Actions" card from prompt.md §8. */
export function TaskCard({
  title,
  subtitle,
  status,
  currentStage,
  continueHref,
  detailsHref,
  historyHref,
  extra,
}: TaskCardProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-card transition-shadow hover:shadow-card-hover">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-gray-900">{title}</p>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>
        <StatusBadge status={status} />
      </div>

      {currentStage && (
        <p className="mt-2 text-sm text-gray-600">
          Current stage: <span className="font-medium text-gray-900">{currentStage}</span>
        </p>
      )}

      {extra}

      <div className="mt-4 flex flex-wrap gap-2">
        {continueHref && (
          <Link
            to={continueHref}
            className="min-h-11 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 flex items-center"
          >
            Continue task
          </Link>
        )}
        {detailsHref && (
          <Link
            to={detailsHref}
            className="min-h-11 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center"
          >
            View details
          </Link>
        )}
        {historyHref && (
          <Link
            to={historyHref}
            className="min-h-11 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center"
          >
            View history
          </Link>
        )}
      </div>
    </div>
  )
}
