import type { ReactNode } from 'react'
import { EmptyState } from './EmptyState'
import { MobileRecordCard } from './MobileRecordCard'

export interface DataTableColumn<T> {
  key: string
  header: string
  render: (row: T) => ReactNode
  /** Show this column's value as the card title on mobile instead of a table cell. */
  isPrimary?: boolean
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  rows: T[]
  getRowId: (row: T) => string | number
  emptyTitle?: string
  emptyDescription?: string
  onRowClick?: (row: T) => void
}

/**
 * Renders as a real table on tablet/desktop and stacked cards on mobile
 * (prompt.md §25 — "record cards instead of wide tables" below tablet width).
 */
export function DataTable<T>({
  columns,
  rows,
  getRowId,
  emptyTitle = 'No records yet',
  emptyDescription,
  onRowClick,
}: DataTableProps<T>) {
  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />
  }

  return (
    <>
      <div className="hidden overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-card sm:block">
        <table className="w-full min-w-full divide-y divide-gray-200 text-left text-sm">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((col) => (
                <th key={col.key} scope="col" className="px-4 py-3 font-semibold text-gray-700">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {rows.map((row) => (
              <tr
                key={getRowId(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={onRowClick ? 'cursor-pointer transition-colors hover:bg-brand-50/60' : undefined}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-gray-800">
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 sm:hidden">
        {rows.map((row) => (
          <MobileRecordCard
            key={getRowId(row)}
            title={columns.find((c) => c.isPrimary)?.render(row) ?? columns[0]?.render(row)}
            fields={columns.filter((c) => !c.isPrimary).map((c) => ({ label: c.header, value: c.render(row) }))}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
          />
        ))}
      </div>
    </>
  )
}
