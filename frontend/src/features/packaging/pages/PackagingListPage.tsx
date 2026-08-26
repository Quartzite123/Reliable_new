import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, type DataTableColumn } from '@/components/data/DataTable'
import { LoadingState } from '@/components/data/LoadingState'
import { ErrorState } from '@/components/data/ErrorState'
import { usePermission } from '@/permissions/usePermission'
import { usePackagingRecords } from '../hooks'
import type { PackagingRow } from '../types'

export function PackagingListPage() {
  const navigate = useNavigate()
  const { data, isLoading, error, refetch } = usePackagingRecords()
  const canCreate = usePermission('packaging:create')

  const columns: DataTableColumn<PackagingRow>[] = [
    { key: 'lot', header: 'Lot ID', render: (r) => r.record.lotId, isPrimary: true },
    { key: 'farmer', header: 'Farmer', render: (r) => r.farmerName },
    { key: 'customer', header: 'Customer', render: (r) => r.customerName },
    { key: 'packSize', header: 'Pack size', render: (r) => r.record.packSize },
    { key: 'net', header: 'Net weight', render: (r) => `${r.record.netWeightKg} kg` },
  ]

  return (
    <>
      <PageHeader
        title="Packaging"
        actions={
          canCreate && (
            <button
              type="button"
              onClick={() => navigate('/packaging/new')}
              className="min-h-11 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
            >
              New packing run
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
          getRowId={(r) => r.record.id}
          onRowClick={(r) => navigate(`/packaging/${r.record.id}`)}
          emptyTitle="No packing runs yet"
        />
      )}
    </>
  )
}
