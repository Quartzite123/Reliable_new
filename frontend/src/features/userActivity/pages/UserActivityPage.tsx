import { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, type DataTableColumn } from '@/components/data/DataTable'
import { LoadingState } from '@/components/data/LoadingState'
import { ErrorState } from '@/components/data/ErrorState'
import { FilterBar } from '@/components/data/FilterBar'
import { Select } from '@/components/forms/Select'
import { ROLE_LABELS } from '@/permissions/permissions'
import type { Role } from '@/types/common'
import { useUserActivity } from '../hooks'
import type { UserActivityRow } from '../types'

const ACTIVE_OPTIONS: Array<{ value: 'active' | 'inactive'; label: string }> = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

function formatTimestamp(value: string | null) {
  return value ? new Date(value).toLocaleString() : '—'
}

export function UserActivityPage() {
  const [role, setRole] = useState<Role | ''>('')
  const [activeFilter, setActiveFilter] = useState<'active' | 'inactive' | ''>('')
  const [activeOnly, setActiveOnly] = useState(false)

  const { data, isLoading, error, refetch } = useUserActivity()

  const rows = (data ?? []).filter((u) => {
    if (role && !u.roles.includes(role)) return false
    if (activeFilter && (activeFilter === 'active') !== u.active) return false
    if (activeOnly && (!u.lastLoginAt || (u.lastLogoutAt && u.lastLogoutAt > u.lastLoginAt))) return false
    return true
  })

  const columns: DataTableColumn<UserActivityRow>[] = [
    { key: 'name', header: 'Name', render: (u) => u.name, isPrimary: true },
    { key: 'email', header: 'Email', render: (u) => u.email },
    { key: 'roles', header: 'Roles', render: (u) => u.roles.map((r) => ROLE_LABELS[r]).join(', ') },
    { key: 'status', header: 'Status', render: (u) => (u.active ? 'Active' : 'Inactive') },
    { key: 'lastLogin', header: 'Last successful login', render: (u) => formatTimestamp(u.lastLoginAt) },
    { key: 'lastLogout', header: 'Last logout', render: (u) => formatTimestamp(u.lastLogoutAt) },
    { key: 'lastActivity', header: 'Last activity', render: (u) => formatTimestamp(u.lastActivityAt) },
    { key: 'failedLogins', header: 'Failed login count', render: (u) => u.failedLoginCount },
    { key: 'lastFailedLogin', header: 'Last failed login', render: (u) => formatTimestamp(u.lastFailedLoginAt) },
  ]

  return (
    <>
      <PageHeader title="User Activity" description="Login and session activity per user account." />

      <FilterBar>
        <Select
          aria-label="Filter by role"
          options={(Object.entries(ROLE_LABELS) as Array<[Role, string]>).map(([value, label]) => ({ value, label }))}
          placeholder="All roles"
          value={role}
          onChange={(e) => setRole(e.target.value as Role | '')}
        />
        <Select
          aria-label="Filter by status"
          options={ACTIVE_OPTIONS}
          placeholder="All statuses"
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value as 'active' | 'inactive' | '')}
        />
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} className="h-4 w-4" />
          Active session only
        </label>
      </FilterBar>

      {isLoading && <LoadingState rows={5} />}
      {error && <ErrorState error={error} onRetry={() => refetch()} />}
      {!isLoading && !error && (
        <DataTable columns={columns} rows={rows} getRowId={(u) => u.userId} emptyTitle="No user activity yet" />
      )}
    </>
  )
}
