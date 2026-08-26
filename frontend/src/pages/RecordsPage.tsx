import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/data/EmptyState'

export function RecordsPage() {
  return (
    <>
      <PageHeader title="My Records" description="Records you have created or worked on." />
      <EmptyState title="No records yet" />
    </>
  )
}
