import type { ReactNode } from 'react'

interface SectionCardProps {
  title?: string
  description?: string
  children: ReactNode
}

/** Used to break long forms into logical sections (prompt.md 24). */
export function SectionCard({ title, description, children }: SectionCardProps) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-card sm:p-5">
      {(title || description) && (
        <div className="mb-4 border-b border-gray-100 pb-3">
          {title && <h2 className="text-base font-semibold text-gray-900">{title}</h2>}
          {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
        </div>
      )}
      {children}
    </section>
  )
}
