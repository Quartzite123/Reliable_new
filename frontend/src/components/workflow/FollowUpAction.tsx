import { Link } from 'react-router-dom'

interface FollowUpActionProps {
  reason: string
  followUpHref: string
}

/**
 * Shown on a failed QC/inspection record. Failed records are never deleted
 * (Business_Rules R16/R17) — this only offers a new attempt, linked back to
 * the original.
 */
export function FollowUpAction({ reason, followUpHref }: FollowUpActionProps) {
  return (
    <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4">
      <p className="text-sm font-semibold text-red-900">Failed</p>
      <p className="mt-1 text-sm text-red-800">Reason: {reason}</p>
      <Link
        to={followUpHref}
        className="mt-3 inline-flex min-h-11 items-center rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800"
      >
        Create follow-up / re-attempt
      </Link>
    </div>
  )
}
