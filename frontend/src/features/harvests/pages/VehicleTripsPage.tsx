import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, type DataTableColumn } from '@/components/data/DataTable'
import { LoadingState } from '@/components/data/LoadingState'
import { ErrorState } from '@/components/data/ErrorState'
import { StatusBadge } from '@/components/workflow/StatusBadge'
import { usePermission } from '@/permissions/usePermission'
import { useVehicleTrips } from '../hooks'
import type { VehicleTripRow } from '../types'

export function VehicleTripsPage() {
  const navigate = useNavigate()
  const { data, isLoading, error, refetch } = useVehicleTrips()
  const canWeigh = usePermission('weighing:create')

  const columns: DataTableColumn<VehicleTripRow>[] = [
    { key: 'vehicle', header: 'Vehicle Trip', render: (r) => r.trip.vehicleNo, isPrimary: true },
    { key: 'farmer', header: 'Farmer', render: (r) => r.farmerName },
    { key: 'plot', header: 'Plot', render: (r) => r.plotNumber },
    { key: 'date', header: 'Harvest date', render: (r) => r.harvestDate },
    { key: 'crates', header: 'Crates', render: (r) => r.trip.numCrates },
    { key: 'status', header: 'Weighing', render: (r) => <StatusBadge status={r.weighed ? 'completed' : 'not_started'} /> },
  ]

  return (
    <>
      <PageHeader title="Vehicle Trips" description="Every truck trip recorded during harvesting." />

      {isLoading && <LoadingState rows={4} />}
      {error && <ErrorState error={error} onRetry={() => refetch()} />}
      {!isLoading && !error && (
        <DataTable
          columns={columns}
          rows={data ?? []}
          getRowId={(r) => r.trip.id}
          onRowClick={
            canWeigh ? (r) => navigate(r.weighed ? '/weighing' : `/weighing/new?vehicleTripId=${r.trip.id}`) : undefined
          }
          emptyTitle="No vehicle trips yet"
        />
      )}
    </>
  )
}
