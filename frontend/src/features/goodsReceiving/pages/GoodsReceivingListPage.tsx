import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, type DataTableColumn } from '@/components/data/DataTable'
import { LoadingState } from '@/components/data/LoadingState'
import { ErrorState } from '@/components/data/ErrorState'
import { StatusBadge } from '@/components/workflow/StatusBadge'
import { usePermission } from '@/permissions/usePermission'
import { useGoodsReceivingRecords } from '../hooks'
import type { GoodsReceivingRow } from '../types'

export function GoodsReceivingListPage() {
  const navigate = useNavigate()
  const { data, isLoading, error, refetch } = useGoodsReceivingRecords()
  // No 'goodsReceiving:*' permission key exists (this feature is out of scope, unrouted — CLAUDE.md).
  // Closest existing key: goods receiving happens right after Weighing in the mock's own gating logic.
  const canCreate = usePermission('weighing:create')

  const columns: DataTableColumn<GoodsReceivingRow>[] = [
    { key: 'vehicle', header: 'Vehicle Trip', render: (r) => r.vehicleNo, isPrimary: true },
    { key: 'farmer', header: 'Farmer', render: (r) => r.farmerName },
    { key: 'plot', header: 'Plot', render: (r) => r.plotNumber },
    { key: 'accepted', header: 'Accepted weight', render: (r) => `${r.record.acceptedWeightKg} kg` },
    { key: 'status', header: 'Status', render: () => <StatusBadge status="completed" /> },
  ]

  return (
    <>
      <PageHeader
        title="Goods Receiving"
        actions={
          canCreate && (
            <button
              type="button"
              onClick={() => navigate('/goods-receiving/new')}
              className="min-h-11 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
            >
              Confirm receipt
            </button>
          )
        }
      />

      {isLoading && <LoadingState rows={4} />}
      {error && <ErrorState error={error} onRetry={() => refetch()} />}
      {!isLoading && !error && (
        <DataTable columns={columns} rows={data ?? []} getRowId={(r) => r.record.id} emptyTitle="No goods receiving records yet" />
      )}
    </>
  )
}
