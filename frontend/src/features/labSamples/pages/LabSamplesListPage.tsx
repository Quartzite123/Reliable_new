import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, type DataTableColumn } from '@/components/data/DataTable'
import { LoadingState } from '@/components/data/LoadingState'
import { ErrorState } from '@/components/data/ErrorState'
import { StatusBadge } from '@/components/workflow/StatusBadge'
import { usePermission } from '@/permissions/usePermission'
import { useLabSamples } from '../hooks'
import type { LabSampleRow } from '../types'

export function LabSamplesListPage() {
  const navigate = useNavigate()
  const { data, isLoading, error, refetch } = useLabSamples()
  const canCreate = usePermission('labSamples:create')

  const columns: DataTableColumn<LabSampleRow>[] = [
    { key: 'farmer', header: 'Farmer', render: (r) => r.reference.farmerName, isPrimary: true },
    { key: 'plot', header: 'Plot', render: (r) => `${r.reference.plotNumber} (${r.reference.mhRegistrationNumber})` },
    { key: 'tss', header: 'TSS', render: (r) => r.sample.tssValue },
    { key: 'result', header: 'Result', render: (r) => <StatusBadge status={r.sample.result === 'Pass' ? 'passed' : 'failed'} /> },
  ]

  return (
    <>
      <PageHeader
        title="Lab Sampling / MRL"
        actions={
          canCreate && (
            <button
              type="button"
              onClick={() => navigate('/lab-samples/new')}
              className="min-h-11 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
            >
              New sample
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
          getRowId={(r) => r.sample.id}
          onRowClick={(r) => navigate(`/lab-samples/${r.sample.id}`)}
          emptyTitle="No lab samples yet"
        />
      )}
    </>
  )
}
