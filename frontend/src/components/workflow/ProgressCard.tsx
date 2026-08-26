import type { ComponentType, SVGProps } from 'react'

interface ProgressCardProps {
  label: string
  value: string | number
  hint?: string
  icon?: ComponentType<SVGProps<SVGSVGElement>>
}

/** Large-number summary tile for home/dashboard screens — no charts (prompt.md §8). */
export function ProgressCard({ label, value, hint, icon: Icon }: ProgressCardProps) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-card">
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
        {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
      </div>
      {Icon && (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
      )}
    </div>
  )
}
