interface ValidationSummaryProps {
  errors: string[]
}

/** Lists all current form errors together, above the form, for long forms on small screens. */
export function ValidationSummary({ errors }: ValidationSummaryProps) {
  if (errors.length === 0) return null

  return (
    <div role="alert" className="rounded-lg border-2 border-red-400 bg-red-50 px-4 py-3">
      <p className="font-semibold text-red-900">Please fix the following before continuing:</p>
      <ul className="mt-2 list-inside list-disc text-sm text-red-800">
        {errors.map((error) => (
          <li key={error}>{error}</li>
        ))}
      </ul>
    </div>
  )
}
