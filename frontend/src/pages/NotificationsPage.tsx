import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/data/EmptyState'

export function NotificationsPage() {
  return (
    <>
      <PageHeader title="Notifications" />
      <EmptyState title="No notifications" description="Alerts like low stock or failed inspections will show up here." />
    </>
  )
}
