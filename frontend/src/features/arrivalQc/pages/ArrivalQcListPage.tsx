import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, type DataTableColumn } from '@/components/data/DataTable'
import { LoadingState } from '@/components/data/LoadingState'
import { ErrorState } from '@/components/data/ErrorState'
import { StatusBadge } from '@/components/workflow/StatusBadge'
import { usePermission } from '@/permissions/usePermission'
import { useArrivalQcRecords } from '../hooks'
import type { ArrivalQcRow } from '../types'

export function ArrivalQcListPage() {
  const navigate = useNavigate()
  const { data, isLoading, error, refetch } = useArrivalQcRecords()
  const canCreate = usePermission('arrivalQc:create')

  const columns: DataTableColumn<ArrivalQcRow>[] = [
    { key: 'farmer', header: 'Farmer', render: (r) => r.farmerName, isPrimary: true },
    { key: 'plot', header: 'Plot', render: (r) => (r.variety ? `${r.plotNumber} — ${r.variety}` : r.plotNumber) },
    { key: 'date', header: 'Inspection date', render: (r) => r.record.inspectionDate },
    { key: 'result', header: 'Result', render: (r) => <StatusBadge status={r.record.result === 'Pass' ? 'passed' : 'failed'} /> },
  ]

  return (
    <>
      <PageHeader
        title="Arrival QC"
        actions={
          canCreate && (
            <button
              type="button"
              onClick={() => navigate('/arrival-qc/new')}
              className="min-h-11 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
            >
              New inspection
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
          onRowClick={(r) => navigate(`/arrival-qc/${r.record.harvestId}`)}
          emptyTitle="No Arrival QC records yet"
        />
      )}
    </>
  )
}
