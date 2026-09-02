import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, type DataTableColumn } from '@/components/data/DataTable'
import { LoadingState } from '@/components/data/LoadingState'
import { ErrorState } from '@/components/data/ErrorState'
import { usePermission } from '@/permissions/usePermission'
import { useContracts } from '../hooks'
import type { ContractRow } from '../types'

export function ContractsListPage() {
  const navigate = useNavigate()
  const { data, isLoading, error, refetch } = useContracts()
  const canCreate = usePermission('contracts:create')

  const columns: DataTableColumn<ContractRow>[] = [
    { key: 'farmer', header: 'Farmer', render: (r) => r.farmerName, isPrimary: true },
    { key: 'plot', header: 'Plot', render: (r) => (r.variety ? `${r.plotNumber} — ${r.variety}` : r.plotNumber) },
    { key: 'season', header: 'Season', render: (r) => r.seasonYear },
    { key: 'rate', header: 'Rate/kg', render: (r) => `₹${r.contract.ratePerKg}` },
    { key: 'rejection', header: 'Rejection %', render: (r) => `${r.contract.rejectionPercent}%` },
  ]

  return (
    <>
      <PageHeader
        title="Farmer Contracts"
        actions={
          canCreate && (
            <button
              type="button"
              onClick={() => navigate('/contracts/new')}
              className="min-h-11 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
            >
              New contract
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
          getRowId={(r) => r.contract.id}
          onRowClick={(r) => navigate(`/contracts/${r.contract.id}`)}
          emptyTitle="No contracts yet"
        />
      )}
    </>
  )
}
