import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, type DataTableColumn } from '@/components/data/DataTable'
import { LoadingState } from '@/components/data/LoadingState'
import { ErrorState } from '@/components/data/ErrorState'
import { useWeighingRecords } from '../hooks'
import type { WeighingRow } from '../types'

export function WeighingListPage() {
  const navigate = useNavigate()
  const { data, isLoading, error, refetch } = useWeighingRecords()

  const columns: DataTableColumn<WeighingRow>[] = [
    { key: 'vehicle', header: 'Vehicle Trip', render: (r) => r.vehicleNo ?? `#${r.record.vehicleTripId}`, isPrimary: true },
    { key: 'farmer', header: 'Farmer', render: (r) => r.farmerName ?? '—' },
    { key: 'net', header: 'Net weight', render: (r) => `${r.record.netWeightKg ?? '—'} kg` },
    { key: 'rejection', header: 'Rejection %', render: (r) => `${r.record.rejectionPct ?? '—'}%` },
  ]

  return (
    <>
      <PageHeader title="Weighing" description="Go to Vehicle Trips to weigh a trip that hasn't been weighed yet." />

      {isLoading && <LoadingState rows={4} />}
      {error && <ErrorState error={error} onRetry={() => refetch()} />}
      {!isLoading && !error && (
        <DataTable
          columns={columns}
          rows={data ?? []}
          getRowId={(r) => r.record.id}
          onRowClick={(r) => navigate(`/weighing/${r.record.id}`)}
          emptyTitle="No weighing records yet"
        />
      )}
    </>
  )
}
