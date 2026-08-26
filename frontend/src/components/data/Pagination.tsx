interface PaginationProps {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}

export function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  if (totalPages <= 1) return null

  return (
    <nav className="flex items-center justify-between gap-3" aria-label="Pagination">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className="min-h-11 min-w-11 rounded-lg border border-gray-300 px-3 text-sm font-medium text-gray-700 disabled:opacity-40"
      >
        Previous
      </button>
      <p className="text-sm text-gray-600">
        Page {page} of {totalPages}
      </p>
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        className="min-h-11 min-w-11 rounded-lg border border-gray-300 px-3 text-sm font-medium text-gray-700 disabled:opacity-40"
      >
        Next
      </button>
    </nav>
  )
}
