import { Link } from 'react-router-dom'

export interface Prerequisite {
  label: string
  met: boolean
  /** Where the worker can go to resolve this if it's missing. */
  resolveHref?: string
  resolveLabel?: string
}

/**
 * Shows gate requirements before a create form (e.g. Contract needs Field QC
 * Pass + Lab Pass + Bank Details — Business_Rules R23, CLAUDE.md §12).
 * This is UX help only; the backend still enforces the gate on submit.
 */
export function PrerequisitePanel({ items }: { items: Prerequisite[] }) {
  const allMet = items.every((item) => item.met)

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <p className="mb-2 text-sm font-semibold text-gray-700">Before you continue</p>
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li key={item.label} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2">
              <span
                aria-hidden
                className={item.met ? 'text-brand-600' : 'text-red-600'}
              >
                {item.met ? '✓' : '✕'}
              </span>
              <span className={item.met ? 'text-gray-700' : 'font-medium text-red-800'}>{item.label}</span>
            </span>
            {!item.met && item.resolveHref && (
              <Link to={item.resolveHref} className="font-medium text-brand-700 underline">
                {item.resolveLabel ?? 'Resolve'}
              </Link>
            )}
          </li>
        ))}
      </ul>
      {!allMet && (
        <p className="mt-3 text-sm font-medium text-red-700">
          This record cannot continue until every item above is complete.
        </p>
      )}
    </div>
  )
}
