import { PageHeader } from '@/components/layout/PageHeader'
import { Alert } from '@/components/feedback/Alert'

interface UnscopedPlaceholderPageProps {
  title: string
  openQuestionRef?: string
}

/**
 * For modules with no finalized business spec yet (Container Indent/Loading,
 * Farmer Invoice, Export Documents, Finished Goods QC, Reports — prompt.md
 * §20/Open_Questions.md). Deliberately has no operational buttons — inventing
 * workflow behavior here would violate CLAUDE.md's "never invent business
 * rules" instruction.
 */
export function UnscopedPlaceholderPage({ title, openQuestionRef }: UnscopedPlaceholderPageProps) {
  return (
    <>
      <PageHeader title={title} />
      <Alert variant="info" title="Screen specification pending business confirmation.">
        This module's rules are still being confirmed with the business owner
        {openQuestionRef ? ` (see ${openQuestionRef} in Open_Questions.md)` : ''}. It will be built once the
        workflow is finalized — no data-entry actions are available here yet.
      </Alert>
    </>
  )
}
