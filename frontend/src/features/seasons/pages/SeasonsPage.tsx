import { useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionCard } from '@/components/layout/SectionCard'
import { DataTable, type DataTableColumn } from '@/components/data/DataTable'
import { LoadingState } from '@/components/data/LoadingState'
import { ErrorState } from '@/components/data/ErrorState'
import { useSeasons } from '../hooks'
import { SeasonForm } from '../components/SeasonForm'
import type { Season } from '../types'

export function SeasonsPage() {
  const [searchParams] = useSearchParams()
  const { pathname } = useLocation()
  const openNew = searchParams.get('new') === '1' || pathname.endsWith('/new')
  const [showNewForm, setShowNewForm] = useState(openNew)
  const [editingSeason, setEditingSeason] = useState<Season | null>(null)
  const { data: seasons, isLoading, error, refetch } = useSeasons()

  const columns: DataTableColumn<Season>[] = [
    { key: 'year', header: 'Year', render: (s) => s.year, isPrimary: true },
    { key: 'startDate', header: 'Start', render: (s) => s.startDate },
    { key: 'endDate', header: 'End', render: (s) => s.endDate },
    { key: 'status', header: 'Status', render: (s) => (s.status === 'active' ? 'Active' : 'Closed') },
    { key: 'notes', header: 'Notes', render: (s) => s.notes ?? '—' },
    {
      key: 'actions',
      header: 'Actions',
      render: (s) => (
        <button type="button" className="text-sm font-medium text-brand-700 underline" onClick={() => setEditingSeason(s)}>
          Edit
        </button>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Seasons"
        description="Each grape season runs roughly February to April; the whole pipeline resets against it."
        actions={
          <button
            type="button"
            onClick={() => setShowNewForm((v) => !v)}
            className="min-h-11 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
          >
            {showNewForm ? 'Cancel' : 'Start New Season'}
          </button>
        }
      />

      {showNewForm && (
        <SectionCard title="Start New Season">
          <SeasonForm onDone={() => setShowNewForm(false)} />
        </SectionCard>
      )}

      {editingSeason && (
        <SectionCard title={`Edit season ${editingSeason.year}`}>
          <SeasonForm season={editingSeason} onDone={() => setEditingSeason(null)} />
        </SectionCard>
      )}

      <SectionCard title="All seasons">
        {isLoading && <LoadingState rows={3} />}
        {error && <ErrorState error={error} onRetry={() => refetch()} />}
        {!isLoading && !error && (
          <DataTable columns={columns} rows={seasons ?? []} getRowId={(s) => s.id} emptyTitle="No seasons yet" />
        )}
      </SectionCard>
    </>
  )
}
