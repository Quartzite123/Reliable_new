import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, type DataTableColumn } from '@/components/data/DataTable'
import { LoadingState } from '@/components/data/LoadingState'
import { ErrorState } from '@/components/data/ErrorState'
import { StatusBadge } from '@/components/workflow/StatusBadge'
import { seasonStatusToBadgeStatus, SEASON_STATUS_LABELS } from '@/types/season'
import { useSeasonRegistrations } from '../hooks'
import type { SeasonRegistrationRow } from '../types'

export function SeasonRegistrationsListPage() {
  const navigate = useNavigate()
  const { data, isLoading, error, refetch } = useSeasonRegistrations()

  const columns: DataTableColumn<SeasonRegistrationRow>[] = [
    { key: 'farmer', header: 'Farmer', render: (r) => r.farmerName, isPrimary: true },
    { key: 'plot', header: 'Plot', render: (r) => `${r.plotNumber} (${r.mhRegistrationNumber})` },
    { key: 'season', header: 'Season', render: (r) => r.registration.seasonYear },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <StatusBadge status={seasonStatusToBadgeStatus(r.registration.status)} />,
    },
  ]

  return (
    <>
      <PageHeader
        title="Season Registrations"
        description="Every plot's registration for a season — created from the Plot + Field QC screen, not here."
      />

      {isLoading && <LoadingState rows={4} />}
      {error && <ErrorState error={error} onRetry={() => refetch()} />}
      {!isLoading && !error && (
        <DataTable
          columns={columns}
          rows={data ?? []}
          getRowId={(r) => r.registration.id}
          onRowClick={(r) => navigate(`/plots/${r.registration.plotId}`)}
          emptyTitle="No season registrations yet"
          emptyDescription="Register a plot with Field QC to create the first one."
        />
      )}
      <p className="text-xs text-gray-400">
        Status label reference:{' '}
        {Object.entries(SEASON_STATUS_LABELS)
          .map(([, label]) => label)
          .join(' → ')}
      </p>
    </>
  )
}
