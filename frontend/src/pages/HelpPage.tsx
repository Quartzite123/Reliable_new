import { PageHeader } from '@/components/layout/PageHeader'
import { SectionCard } from '@/components/layout/SectionCard'

export function HelpPage() {
  return (
    <>
      <PageHeader title="Help" />
      <SectionCard title="Need help?">
        <p className="text-sm text-gray-700">
          If something isn't working or you're not sure what to do next, contact your supervisor or Admin.
        </p>
      </SectionCard>
    </>
  )
}
