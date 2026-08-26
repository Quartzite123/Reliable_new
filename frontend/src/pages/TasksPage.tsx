import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/data/EmptyState'

export function TasksPage() {
  return (
    <>
      <PageHeader title="My Tasks" description="Everything assigned to you that still needs action." />
      <EmptyState title="No tasks right now" description="New tasks appear here as records move through the workflow." />
    </>
  )
}
