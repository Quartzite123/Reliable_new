import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/data/EmptyState'

interface ComingSoonPageProps {
  title: string
  phase: string
}

/**
 * For modules that ARE fully scoped (prompt.md §7) but not yet built in this
 * incremental, phase-by-phase implementation (prompt.md §29/§31). Distinct
 * from UnscopedPlaceholderPage: this is a build-sequencing placeholder, not
 * an unresolved-business-rule placeholder.
 */
export function ComingSoonPage({ title, phase }: ComingSoonPageProps) {
  return (
    <>
      <PageHeader title={title} />
      <EmptyState title="This screen is coming soon" description={`Scheduled for ${phase} of the frontend build.`} />
    </>
  )
}
