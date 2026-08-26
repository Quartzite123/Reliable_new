import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { SearchBar } from '@/components/data/SearchBar'
import { DataTable, type DataTableColumn } from '@/components/data/DataTable'
import { LoadingState } from '@/components/data/LoadingState'
import { ErrorState } from '@/components/data/ErrorState'
import { usePermission } from '@/permissions/usePermission'
import { useFarmers } from '../hooks'
import type { Farmer } from '../types'

export function FarmersListPage() {
  const navigate = useNavigate()
  const { data: farmers, isLoading, error, refetch } = useFarmers()
  const [query, setQuery] = useState('')
  const canCreate = usePermission('farmers:create')

  const filtered = useMemo(() => {
    if (!farmers) return []
    const lower = query.trim().toLowerCase()
    if (!lower) return farmers
    return farmers.filter((f) => f.name.toLowerCase().includes(lower) || f.mobile.includes(lower))
  }, [farmers, query])

  const columns: DataTableColumn<Farmer>[] = [
    { key: 'name', header: 'Name', render: (f) => f.name, isPrimary: true },
    { key: 'mobile', header: 'Mobile', render: (f) => f.mobile },
    {
      key: 'status',
      header: 'Status',
      render: (f) => (
        <span className={f.status === 'active' ? 'text-brand-700' : 'text-gray-400'}>
          {f.status === 'active' ? 'Active' : 'Inactive'}
        </span>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Farmers"
        actions={
          canCreate && (
            <button
              type="button"
              onClick={() => navigate('/farmers/new')}
              className="min-h-11 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
            >
              Register farmer
            </button>
          )
        }
      />

      <SearchBar value={query} onChange={setQuery} placeholder="Search by name or mobile" />

      {isLoading && <LoadingState rows={4} />}
      {error && <ErrorState error={error} onRetry={() => refetch()} />}
      {!isLoading && !error && (
        <DataTable
          columns={columns}
          rows={filtered}
          getRowId={(f) => f.id}
          onRowClick={(f) => navigate(`/farmers/${f.id}`)}
          emptyTitle="No farmers found"
        />
      )}
    </>
  )
}
