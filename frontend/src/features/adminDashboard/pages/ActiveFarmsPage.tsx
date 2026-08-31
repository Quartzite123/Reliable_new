import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, type DataTableColumn } from '@/components/data/DataTable'
import { LoadingState } from '@/components/data/LoadingState'
import { ErrorState } from '@/components/data/ErrorState'
import { FilterBar } from '@/components/data/FilterBar'
import { Select } from '@/components/forms/Select'
import { StatusBadge } from '@/components/workflow/StatusBadge'
import { seasonStatusToBadgeStatus, SEASON_STATUS_LABELS } from '@/types/season'
import { useSeasonRegistrations } from '@/features/seasonRegistrations/hooks'
import type { SeasonRegistrationRow } from '@/features/seasonRegistrations/types'

const ALL = ''

export function ActiveFarmsPage() {
  const navigate = useNavigate()
  const { data, isLoading, error, refetch } = useSeasonRegistrations()

  const [season, setSeason] = useState(ALL)
  const [stage, setStage] = useState(ALL)
  const [passFail, setPassFail] = useState(ALL)

  const rows = data ?? []

  const seasonOptions = useMemo(
    () => Array.from(new Set((data ?? []).map((r) => r.registration.seasonYear))).sort((a, b) => b - a),
    [data],
  )

  const filtered = rows.filter((r) => {
    if (season && r.registration.seasonYear !== Number(season)) return false
    if (stage && r.registration.status !== stage) return false
    // "Passed / Advanced" = anything that isn't Registered (not_started) and
    // isn't a Failed status — matches seasonStatusToBadgeStatus's own
    // classification rather than re-deriving it against raw status strings.
    const badgeStatus = seasonStatusToBadgeStatus(r.registration.status)
    if (passFail === 'passed' && badgeStatus !== 'passed' && badgeStatus !== 'in_progress') return false
    if (passFail === 'failed' && badgeStatus !== 'failed') return false
    return true
  })

  const columns: DataTableColumn<SeasonRegistrationRow>[] = [
    { key: 'farmer', header: 'Farmer', render: (r) => r.farmerName, isPrimary: true },
    { key: 'mhNumber', header: 'MH Number', render: (r) => r.mhRegistrationNumber ?? '—' },
    { key: 'season', header: 'Season', render: (r) => r.registration.seasonYear },
    { key: 'plot', header: 'Plot', render: (r) => r.plotNumber },
    { key: 'stage', header: 'Stage', render: (r) => <StatusBadge status={seasonStatusToBadgeStatus(r.registration.status)} /> },
    { key: 'updatedAt', header: 'Last updated', render: (r) => new Date(r.registration.updatedAt).toLocaleDateString() },
  ]

  return (
    <>
      <PageHeader title="Active Farms" description="Active seasonal operations across every plot and farmer." />

      <FilterBar>
        <Select aria-label="Season" options={seasonOptions.map((y) => ({ value: String(y), label: String(y) }))} placeholder="All seasons" value={season} onChange={(e) => setSeason(e.target.value)} />
        <Select aria-label="Stage" options={Object.entries(SEASON_STATUS_LABELS).map(([value, label]) => ({ value, label }))} placeholder="All stages" value={stage} onChange={(e) => setStage(e.target.value)} />
        <Select aria-label="Passed/Failed" options={[{ value: 'passed', label: 'Passed / Advanced' }, { value: 'failed', label: 'Failed' }]} placeholder="Passed or failed" value={passFail} onChange={(e) => setPassFail(e.target.value)} />
      </FilterBar>

      {isLoading && <LoadingState rows={5} />}
      {error && <ErrorState error={error} onRetry={() => refetch()} />}
      {!isLoading && !error && (
        <DataTable
          columns={columns}
          rows={filtered}
          getRowId={(r) => r.registration.id}
          onRowClick={(r) => navigate(`/plots/${r.registration.plotId}`)}
          emptyTitle="No active farms match these filters"
        />
      )}
    </>
  )
}
