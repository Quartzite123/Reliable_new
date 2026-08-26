import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, type DataTableColumn } from '@/components/data/DataTable'
import { LoadingState } from '@/components/data/LoadingState'
import { ErrorState } from '@/components/data/ErrorState'
import { usePermission } from '@/permissions/usePermission'
import { useHarvests } from '../hooks'
import type { HarvestRow } from '../types'

export function HarvestsListPage() {
  const navigate = useNavigate()
  const { data, isLoading, error, refetch } = useHarvests()
  const canCreate = usePermission('harvests:create')

  const columns: DataTableColumn<HarvestRow>[] = [
    { key: 'farmer', header: 'Farmer', render: (r) => r.farmerName, isPrimary: true },
    { key: 'plot', header: 'Plot', render: (r) => r.plotNumber },
    { key: 'date', header: 'Harvest date', render: (r) => r.harvest.harvestDate },
    { key: 'trips', header: 'Vehicle trips', render: (r) => r.tripCount },
  ]

  return (
    <>
      <PageHeader
        title="Harvesting"
        actions={
          canCreate && (
            <button
              type="button"
              onClick={() => navigate('/harvests/new')}
              className="min-h-11 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
            >
              Record harvest
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
          getRowId={(r) => r.harvest.id}
          onRowClick={(r) => navigate(`/harvests/${r.harvest.id}`)}
          emptyTitle="No harvests recorded yet"
        />
      )}
    </>
  )
}
