import type { ReactNode } from 'react'

interface MobileRecordCardProps {
  title: ReactNode
  fields: Array<{ label: string; value: ReactNode }>
  onClick?: () => void
}

export function MobileRecordCard({ title, fields, onClick }: MobileRecordCardProps) {
  const Wrapper = onClick ? 'button' : 'div'

  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className="w-full rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-card active:bg-gray-50"
    >
      <p className="text-base font-semibold text-gray-900">{title}</p>
      <dl className="mt-2 grid grid-cols-1 gap-1 text-sm text-gray-600">
        {fields.map((field) => (
          <div key={field.label} className="flex justify-between gap-3">
            <dt className="text-gray-500">{field.label}</dt>
            <dd className="text-right font-medium text-gray-800">{field.value}</dd>
          </div>
        ))}
      </dl>
    </Wrapper>
  )
}
