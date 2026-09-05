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
 * (prompt.md 25 — "record cards instead of wide tables" below tablet width).
 *
 * Changes made for scannability: the header row sticks while the body
 * scrolls, so a worker reading row 40 still knows which column is which;
 * rows alternate against a faint tint, which is the cheapest way to stop
 * the eye slipping a line on a wide table; and the header label is
 * uppercase-free but weighted, since all-caps costs legibility for
 * readers with limited English.
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
      <div className="hidden overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-card sm:block">
        <table className="w-full min-w-full text-left text-sm">
          <thead className="sticky top-0 z-10 bg-gray-100">
            <tr className="border-b border-gray-200">
              {columns.map((col) => (
                <th key={col.key} scope="col" className="px-4 py-3 font-semibold whitespace-nowrap text-gray-700">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={getRowId(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={[
                  'border-b border-gray-100 last:border-b-0 even:bg-gray-50/60',
                  onRowClick ? 'cursor-pointer hover:bg-brand-50' : '',
                ].join(' ')}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 align-middle text-gray-800">
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
