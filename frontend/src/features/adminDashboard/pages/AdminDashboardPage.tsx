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
import { useFarmers } from '@/features/farmers/hooks'
import { useSeasonRegistrations } from '@/features/seasonRegistrations/hooks'
import { usePackagingRecords } from '@/features/packaging/hooks'
import { useLowStockAlerts } from '@/features/inventory/hooks'
import { useCurrentSeason } from '../../seasons/hooks'

const TODAY = new Date().toISOString().slice(0, 10)

export function AdminDashboardPage() {
  const { user } = useAuth()
  const { data: currentSeason } = useCurrentSeason()
  const { data: farmers } = useFarmers()
  const { data: registrations } = useSeasonRegistrations()
  const { data: packagingRecords } = usePackagingRecords()
  const { data: lowStockAlerts } = useLowStockAlerts()

  const byStatus = (statuses: string[]) => (registrations ?? []).filter((r) => statuses.includes(r.registration.status)).length

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
            <ProgressCard label="Active plots" value={new Set((registrations ?? []).map((r) => r.plotNumber)).size} icon={MapPinIcon} />
          </Link>
          <Link to="/season-registrations?status=registered">
            <ProgressCard label="Field QC pending" value={byStatus(['registered'])} icon={SearchCheckIcon} />
          </Link>
          <Link to="/season-registrations?status=field_qc_passed">
            <ProgressCard label="Lab sampling/tests pending" value={byStatus(['field_qc_passed'])} icon={FlaskIcon} />
          </Link>
          <Link to="/season-registrations?status=lab_passed">
            <ProgressCard label="Contracts pending" value={byStatus(['lab_passed'])} icon={ContractIcon} />
          </Link>
          <Link to="/season-registrations?status=under_contract">
            <ProgressCard label="Harvests in progress" value={byStatus(['under_contract', 'harvested_partial'])} icon={TruckIcon} />
          </Link>
          <Link to="/season-registrations?status=harvested_partial">
            <ProgressCard label="Weighing pending" value={byStatus(['harvested_partial'])} icon={ScaleIcon} />
          </Link>
          <Link to="/season-registrations?status=weighed">
            <ProgressCard label="Arrival QC pending" value={byStatus(['weighed'])} icon={SearchCheckIcon} />
          </Link>
          <Link to="/packaging">
            <ProgressCard label="Packaging runs today" value={packagingToday} icon={PackageIcon} />
          </Link>
          <Link to="/season-registrations?status=packed">
            <ProgressCard label="Pre-cooling pending" value={byStatus(['packed', 'palletised'])} icon={SnowflakeIcon} />
          </Link>
          <Link to="/inventory/alerts">
            <ProgressCard label="Low-stock alerts" value={(lowStockAlerts ?? []).length} icon={BoxesIcon} />
          </Link>
        </div>
      </SectionCard>
    </>
  )
}
