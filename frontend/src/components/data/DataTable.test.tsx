import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DataTable } from './DataTable'

interface Row {
  id: string
  name: string
}

describe('DataTable', () => {
  it('renders both a desktop table and a mobile card list for the same rows (prompt.md §25)', () => {
    const rows: Row[] = [{ id: '1', name: 'Ajay Digambar Vadje' }]
    render(
      <DataTable
        columns={[{ key: 'name', header: 'Name', render: (r) => r.name, isPrimary: true }]}
        rows={rows}
        getRowId={(r) => r.id}
      />,
    )

    // Both layouts are present in the DOM at once; Tailwind's `hidden sm:block` /
    // `sm:hidden` classes are what actually switch between them at runtime.
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getAllByText('Ajay Digambar Vadje').length).toBe(2)
  })

  it('shows an empty state instead of an empty table when there are no rows', () => {
    render(<DataTable columns={[{ key: 'name', header: 'Name', render: (r: Row) => r.name }]} rows={[]} getRowId={(r: Row) => r.id} emptyTitle="No records yet" />)
    expect(screen.getByText('No records yet')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})
