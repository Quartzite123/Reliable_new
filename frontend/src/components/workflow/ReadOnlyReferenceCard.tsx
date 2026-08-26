interface ReadOnlyReferenceCardProps {
  title: string
  fields: Array<{ label: string; value: string }>
}

/**
 * Visually distinct block for data auto-filled from another role's record
 * (e.g. GPS/taluka shown read-only to a Lab Worker — field-ownership
 * principle, CLAUDE.md §4.1 / Business_Rules R15b).
 */
export function ReadOnlyReferenceCard({ title, fields }: ReadOnlyReferenceCardProps) {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4">
      <p className="mb-2 text-xs font-semibold tracking-wide text-gray-500 uppercase">{title} (reference — read only)</p>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
        {fields.map((field) => (
          <div key={field.label}>
            <dt className="text-xs text-gray-500">{field.label}</dt>
            <dd className="text-sm font-medium text-gray-700">{field.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
