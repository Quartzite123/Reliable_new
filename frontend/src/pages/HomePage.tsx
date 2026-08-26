import { Link } from 'react-router-dom'
import { useAuth } from '@/app/AuthContext'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionCard } from '@/components/layout/SectionCard'
import { EmptyState } from '@/components/data/EmptyState'
import { ProgressCard } from '@/components/workflow/ProgressCard'
import { ROLE_LABELS } from '@/permissions/permissions'
import { useVisibleNav } from '@/routes/useVisibleNav'
import { ChevronRightIcon, RecordsIcon, TasksIcon } from '@/components/icons/Icon'

/**
 * Task-based home screen (prompt.md §8). Real task/record data arrives with
 * each feature phase; this shell shows the true (currently empty) counts —
 * never fabricated numbers — in a compact KPI + activity layout instead of
 * large empty boxes. "Quick Actions" reuses the same permission-filtered
 * nav list every other screen already respects.
 */
export function HomePage() {
  const { user } = useAuth()
  const { operational } = useVisibleNav()
  const quickActions = operational.slice(0, 6)

  return (
    <>
      <PageHeader
        title={`Hello, ${user?.name?.split(' ')[0] ?? ''} 👋`}
        description={user ? `${ROLE_LABELS[user.role]} — here's what needs your attention today.` : undefined}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <ProgressCard label="Pending tasks" value={0} icon={TasksIcon} />
        <ProgressCard label="In progress" value={0} icon={RecordsIcon} />
        <ProgressCard label="Completed" value={0} icon={TasksIcon} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Today's pending tasks">
          <EmptyState
            title="No pending tasks yet"
            description="Once records are entered for your role, tasks that need action will appear here."
          />
        </SectionCard>

        <SectionCard title="In-progress records">
          <EmptyState title="Nothing in progress" description="Records you're actively working on will show up here." />
        </SectionCard>
      </div>

      <SectionCard title="Recent activity">
        <EmptyState title="No recent activity yet" description="Completed records will appear here as they happen." />
      </SectionCard>

      {quickActions.length > 0 && (
        <SectionCard title="Quick actions" description="Jump straight to what you use most.">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {quickActions.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                aria-label={`Go to ${item.label}`}
                className="group flex items-center justify-between gap-2 rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-800"
              >
                <span className="truncate">{item.label}</span>
                <ChevronRightIcon className="h-4 w-4 shrink-0 text-gray-300 group-hover:text-brand-600" />
              </Link>
            ))}
          </div>
        </SectionCard>
      )}
    </>
  )
}
