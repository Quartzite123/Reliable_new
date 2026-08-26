import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, type DataTableColumn } from '@/components/data/DataTable'
import { LoadingState } from '@/components/data/LoadingState'
import { ErrorState } from '@/components/data/ErrorState'
import { StatusBadge } from '@/components/workflow/StatusBadge'
import { usePermission } from '@/permissions/usePermission'
import { usePreCoolingRecords } from '../hooks'
import type { PreCoolingRow } from '../types'

export function PreCoolingListPage() {
  const navigate = useNavigate()
  const { data, isLoading, error, refetch } = usePreCoolingRecords()
  const canCreate = usePermission('preCooling:create')

  const columns: DataTableColumn<PreCoolingRow>[] = [
    { key: 'pallets', header: 'Pallet', render: (r) => r.palletLabel, isPrimary: true },
    { key: 'date', header: 'Date', render: (r) => r.record.date },
    { key: 'in', header: 'In', render: (r) => `${r.record.inTime} · ${r.record.inBerryTemp}°C` },
    { key: 'out', header: 'Out', render: (r) => (r.isComplete ? `${r.record.outTime} · ${r.record.outBerryTemp}°C` : '—') },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.isComplete ? 'completed' : 'in_progress'} /> },
  ]

  return (
    <>
      <PageHeader
        title="Pre-Cooling"
        actions={
          canCreate && (
            <button
              type="button"
              onClick={() => navigate('/pre-cooling/new')}
              className="min-h-11 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
            >
              Log in-time
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
          onRowClick={(r) => navigate(`/pre-cooling/${r.record.id}`)}
          emptyTitle="No pre-cooling entries yet"
        />
      )}
    </>
  )
}
