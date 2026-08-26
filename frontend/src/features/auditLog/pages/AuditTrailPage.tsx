import { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, type DataTableColumn } from '@/components/data/DataTable'
import { LoadingState } from '@/components/data/LoadingState'
import { ErrorState } from '@/components/data/ErrorState'
import { FilterBar } from '@/components/data/FilterBar'
import { TextInput } from '@/components/forms/TextInput'
import { Select } from '@/components/forms/Select'
import { useAuditLog } from '../hooks'
import type { AuditEvent } from '../types'

export function AuditTrailPage() {
  const [userName, setUserName] = useState('')
  const [module, setModule] = useState('')
  const [result, setResult] = useState<'' | 'success' | 'fail'>('')

  const { data, isLoading, error, refetch } = useAuditLog({ result: result || undefined })
  const rows = (data ?? []).filter((e) => {
    if (userName && !e.userName.toLowerCase().includes(userName.toLowerCase())) return false
    if (module && e.module !== module) return false
    return true
  })

  const moduleOptions = Array.from(new Set((data ?? []).map((e) => e.module))).map((m) => ({ value: m, label: m }))

  const columns: DataTableColumn<AuditEvent>[] = [
    { key: 'timestamp', header: 'Timestamp', render: (e) => new Date(e.timestamp).toLocaleString(), isPrimary: true },
    { key: 'user', header: 'User', render: (e) => e.userName },
    { key: 'role', header: 'Role', render: (e) => e.role },
    { key: 'action', header: 'Action', render: (e) => e.action },
    { key: 'module', header: 'Module', render: (e) => e.module },
    { key: 'recordRef', header: 'Record reference', render: (e) => e.recordRef ?? '—' },
    { key: 'result', header: 'Result', render: (e) => (e.result === 'success' ? 'Success' : 'Fail') },
    {
      key: 'statusChange',
      header: 'Old status → new status',
      render: (e) => (e.oldStatus || e.newStatus ? `${e.oldStatus ?? '—'} → ${e.newStatus ?? '—'}` : '—'),
    },
  ]

  return (
    <>
      <PageHeader title="Audit Trail" description="Every recorded action across the system, most recent first." />

      <FilterBar>
        <TextInput aria-label="Filter by user" placeholder="Filter by user" value={userName} onChange={(e) => setUserName(e.target.value)} />
        <Select aria-label="Filter by module" options={moduleOptions} placeholder="All modules" value={module} onChange={(e) => setModule(e.target.value)} />
        <Select
          aria-label="Filter by result"
          options={[
            { value: 'success', label: 'Success' },
            { value: 'fail', label: 'Fail' },
          ]}
          placeholder="All results"
          value={result}
          onChange={(e) => setResult(e.target.value as '' | 'success' | 'fail')}
        />
      </FilterBar>

      {isLoading && <LoadingState rows={6} />}
      {error && <ErrorState error={error} onRetry={() => refetch()} />}
      {!isLoading && !error && (
        <DataTable columns={columns} rows={rows} getRowId={(e) => e.id} emptyTitle="No audit events yet" />
      )}
    </>
  )
}
