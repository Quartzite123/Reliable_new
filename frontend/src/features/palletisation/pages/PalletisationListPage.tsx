import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, type DataTableColumn } from '@/components/data/DataTable'
import { LoadingState } from '@/components/data/LoadingState'
import { ErrorState } from '@/components/data/ErrorState'
import { usePermission } from '@/permissions/usePermission'
import { usePallets } from '../hooks'
import type { PalletRow } from '../types'

export function PalletisationListPage() {
  const navigate = useNavigate()
  const { data, isLoading, error, refetch } = usePallets()
  const canCreate = usePermission('palletisation:create')

  const columns: DataTableColumn<PalletRow>[] = [
    { key: 'palletId', header: 'Pallet ID', render: (r) => r.pallet.palletId, isPrimary: true },
    { key: 'type', header: 'Type', render: (r) => r.pallet.palletType },
    { key: 'boxes', header: 'Total boxes', render: (r) => r.pallet.totalBoxes },
    { key: 'lots', header: 'Lots', render: (r) => r.lotCount },
    { key: 'status', header: 'Status', render: (r) => r.pallet.status.replace('_', ' ') },
  ]

  return (
    <>
      <PageHeader
        title="Palletisation"
        actions={
          canCreate && (
            <button
              type="button"
              onClick={() => navigate('/palletisation/new')}
              className="min-h-11 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
            >
              New pallet
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
          getRowId={(r) => r.pallet.id}
          onRowClick={(r) => navigate(`/palletisation/${r.pallet.id}`)}
          emptyTitle="No pallets yet"
        />
      )}
    </>
  )
}
