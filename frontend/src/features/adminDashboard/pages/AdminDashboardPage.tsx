import { Link } from 'react-router-dom'
import { useAuth } from '@/app/AuthContext'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionCard } from '@/components/layout/SectionCard'
import { ProgressCard } from '@/components/workflow/ProgressCard'
import { LogoMark } from '@/components/icons/Logo'
import {
  BoxesIcon,
  CalendarIcon,
  ContractIcon,
  FarmersIcon,
  FlaskIcon,
  MapPinIcon,
  PackageIcon,
  ScaleIcon,
  SearchCheckIcon,
  SnowflakeIcon,
  TruckIcon,
} from '@/components/icons/Icon'
import type { SeasonRegistrationStatus } from '@/types/season'
import { useFarmers } from '@/features/farmers/hooks'
import { useSeasonRegistrations } from '@/features/seasonRegistrations/hooks'
import { usePackagingRecords } from '@/features/packaging/hooks'
import { useLowStockAlerts } from '@/features/inventory/hooks'
import { useCurrentSeason } from '../../seasons/hooks'

const TODAY = new Date().toISOString().slice(0, 10)

/** `?status=` must carry the real enum value (spaces and all) — encoded here,
 * decoded and compared the same way on SeasonRegistrationsListPage. Do not
 * pass a lowercase/snake_case slug; RegistrationStatus values on the wire are
 * `'Field QC Passed'`, not `'field_qc_passed'` (app/core/enums.py). */
const statusLink = (status: SeasonRegistrationStatus) => `/season-registrations?status=${encodeURIComponent(status)}`

export function AdminDashboardPage() {
  const { user } = useAuth()
  const { data: currentSeason } = useCurrentSeason()
  const { data: farmers } = useFarmers()
  const { data: registrations } = useSeasonRegistrations()
  const { data: packagingRecords } = usePackagingRecords()
  const { data: lowStockAlerts } = useLowStockAlerts()

  const byStatus = (statuses: SeasonRegistrationStatus[]) =>
    (registrations ?? []).filter((r) => statuses.includes(r.registration.status)).length

  const packagingToday = (packagingRecords ?? []).filter((p) => p.record.date === TODAY).length

  return (
    <>
      <div className="flex flex-col gap-3">
        <LogoMark className="h-14 w-auto" />
        <PageHeader
          title={`Welcome, ${user?.name ?? ''}`}
          description={
            currentSeason
              ? `Current Season: ${currentSeason.year} — Start: ${currentSeason.startDate} — End: ${currentSeason.endDate}`
              : 'No season configured yet.'
          }
          actions={
            <Link
              to="/admin/seasons?new=1"
              className="min-h-11 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 flex items-center"
            >
              Start New Season
            </Link>
          }
        />
      </div>

      <SectionCard title="Overview">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Link to="/farmers">
            <ProgressCard label="Active farmers" value={(farmers ?? []).filter((f) => f.status === 'active').length} icon={FarmersIcon} />
          </Link>
          <Link to="/season-registrations">
            <ProgressCard label="Active season registrations" value={(registrations ?? []).length} icon={CalendarIcon} />
          </Link>
          <Link to="/plots">
            <ProgressCard label="Active plots" value={new Set((registrations ?? []).map((r) => r.registration.plotId)).size} icon={MapPinIcon} />
          </Link>
          <Link to={statusLink('Registered')}>
            <ProgressCard label="Field QC pending" value={byStatus(['Registered'])} icon={SearchCheckIcon} />
          </Link>
          <Link to={statusLink('Field QC Passed')}>
            <ProgressCard label="Lab sampling/tests pending" value={byStatus(['Field QC Passed'])} icon={FlaskIcon} />
          </Link>
          <Link to={statusLink('Lab Passed')}>
            <ProgressCard label="Contracts pending" value={byStatus(['Lab Passed'])} icon={ContractIcon} />
          </Link>
          <Link to={statusLink('Under Contract')}>
            <ProgressCard label="Harvests in progress" value={byStatus(['Under Contract', 'Harvested (partial)'])} icon={TruckIcon} />
          </Link>
          <Link to={statusLink('Harvested (partial)')}>
            <ProgressCard label="Weighing pending" value={byStatus(['Harvested (partial)'])} icon={ScaleIcon} />
          </Link>
          <Link to={statusLink('Weighed')}>
            <ProgressCard label="Arrival QC pending" value={byStatus(['Weighed'])} icon={SearchCheckIcon} />
          </Link>
          <Link to="/packaging">
            <ProgressCard label="Packaging runs today" value={packagingToday} icon={PackageIcon} />
          </Link>
          <Link to={statusLink('Packed')}>
            <ProgressCard label="Pre-cooling pending" value={byStatus(['Packed', 'Palletised'])} icon={SnowflakeIcon} />
          </Link>
          <Link to="/inventory/alerts">
            <ProgressCard label="Low-stock alerts" value={(lowStockAlerts ?? []).length} icon={BoxesIcon} />
          </Link>
        </div>
      </SectionCard>
    </>
  )
}
