interface LoadingStateProps {
  label?: string
  rows?: number
}

/** Skeleton block for card/list content while a query is loading. */
export function LoadingState({ label = 'Loading...', rows = 3 }: LoadingStateProps) {
  return (
    <div role="status" aria-label={label} className="flex flex-col gap-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="h-16 w-full animate-pulse rounded-lg bg-gray-200" />
      ))}
      <span className="sr-only">{label}</span>
    </div>
  )
}
