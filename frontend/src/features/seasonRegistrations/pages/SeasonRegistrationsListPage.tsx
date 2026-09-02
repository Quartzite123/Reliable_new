import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, type DataTableColumn } from '@/components/data/DataTable'
import { LoadingState } from '@/components/data/LoadingState'
import { ErrorState } from '@/components/data/ErrorState'
import { Alert } from '@/components/feedback/Alert'
import { StatusBadge } from '@/components/workflow/StatusBadge'
import { seasonStatusToBadgeStatus, SEASON_STATUS_LABELS, type SeasonRegistrationStatus } from '@/types/season'
import { useSeasonRegistrations } from '../hooks'
import type { SeasonRegistrationRow } from '../types'

const KNOWN_STATUSES = Object.keys(SEASON_STATUS_LABELS) as SeasonRegistrationStatus[]

export function SeasonRegistrationsListPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { data, isLoading, error, refetch } = useSeasonRegistrations()

  // useSearchParams already percent-decodes — `?status=Field%20QC%20Passed`
  // comes back as `"Field QC Passed"`, matching RegistrationStatus values
  // (app/core/enums.py) exactly, with no extra decode step needed here.
  const statusParam = searchParams.get('status')
  const isKnownStatus = statusParam !== null && (KNOWN_STATUSES as string[]).includes(statusParam)
  const statusFilter = isKnownStatus ? (statusParam as SeasonRegistrationStatus) : null

  const rows = statusFilter ? (data ?? []).filter((r) => r.registration.status === statusFilter) : (data ?? [])

  const columns: DataTableColumn<SeasonRegistrationRow>[] = [
    { key: 'farmer', header: 'Farmer', render: (r) => r.farmerName, isPrimary: true },
    {
      key: 'plot',
      header: 'Plot',
      render: (r) =>
        `${r.plotNumber}${r.registration.varietyName ? ` — ${r.registration.varietyName}` : ''} (${r.mhRegistrationNumber})`,
    },
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
        description={
          statusFilter
            ? `Filtered to "${SEASON_STATUS_LABELS[statusFilter]}" — created from the Plot + Field QC screen, not here.`
            : "Every plot's registration for a season — created from the Plot + Field QC screen, not here."
        }
      />

      {statusParam !== null && !isKnownStatus && (
        <Alert variant="warning" title="Unknown status filter">
          {`"${statusParam}" doesn't match any known registration status. Showing all registrations instead.`}
        </Alert>
      )}

      {isLoading && <LoadingState rows={4} />}
      {error && <ErrorState error={error} onRetry={() => refetch()} />}
      {!isLoading && !error && (
        <DataTable
          columns={columns}
          rows={rows}
          getRowId={(r) => r.registration.id}
          onRowClick={(r) => navigate(`/plots/${r.registration.plotId}`)}
          emptyTitle={statusFilter ? `No registrations at "${SEASON_STATUS_LABELS[statusFilter]}"` : 'No season registrations yet'}
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
