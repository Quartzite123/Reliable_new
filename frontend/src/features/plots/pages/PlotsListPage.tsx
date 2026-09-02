import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, type DataTableColumn } from '@/components/data/DataTable'
import { LoadingState } from '@/components/data/LoadingState'
import { ErrorState } from '@/components/data/ErrorState'
import { StatusBadge } from '@/components/workflow/StatusBadge'
import { seasonStatusToBadgeStatus } from '@/types/season'
import { usePermission } from '@/permissions/usePermission'
import { usePlots } from '../hooks'
import type { PlotSummary } from '../types'

export function PlotsListPage() {
  const navigate = useNavigate()
  const { data, isLoading, error, refetch } = usePlots()
  const canCreate = usePermission('plots:create')

  const columns: DataTableColumn<PlotSummary>[] = [
    { key: 'plotNumber', header: 'Plot', render: (row) => row.plot.plotNumber, isPrimary: true },
    {
      key: 'variety',
      header: 'Variety',
      render: (row) => (row.plot.varietyNames?.length ? row.plot.varietyNames.join(', ') : (row.plot.variety ?? '—')),
    },
    { key: 'village', header: 'Village', render: (row) => row.plot.village },
    {
      key: 'status',
      header: 'Latest season status',
      render: (row) =>
        row.latestRegistration ? (
          <StatusBadge status={seasonStatusToBadgeStatus(row.latestRegistration.status)} />
        ) : (
          <span className="text-sm text-gray-400">Not registered</span>
        ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Plots"
        actions={
          canCreate && (
            <button
              type="button"
              onClick={() => navigate('/plots/new')}
              className="min-h-11 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
            >
              Register plot
            </button>
          )
        }
      />

      {isLoading && <LoadingState rows={4} />}
      {error && <ErrorState error={error} onRetry={() => refetch()} />}
      {!isLoading && !error && (
        <DataTable
          columns={columns}
          rows={data ?? []}
          getRowId={(row) => row.plot.id}
          onRowClick={(row) => navigate(`/plots/${row.plot.id}`)}
          emptyTitle="No plots yet"
        />
      )}
    </>
  )
}
