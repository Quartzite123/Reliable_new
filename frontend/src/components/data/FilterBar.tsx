import type { ReactNode } from 'react'

/** Horizontal-scroll row of filter controls (selects, chips) that never wraps oddly on mobile. */
export function FilterBar({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1" role="group" aria-label="Filters">
      {children}
    </div>
  )
}
