import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Alert } from '@/components/feedback/Alert'

/**
 * Field QC is recorded on the combined Plot + Field QC screen (Business_Rules
 * R15a), not as a standalone form — this route exists (prompt.md §7) but
 * just points workers to the right place instead of duplicating the form.
 */
export function FieldQcInfoPage() {
  return (
    <>
      <PageHeader title="Field QC" />
      <Alert variant="info">
        Field QC is recorded together with Plot registration on one screen.{' '}
        <Link to="/plots" className="font-semibold underline">
          Go to Plots
        </Link>{' '}
        to register a new plot with its Field QC, or open an existing plot to log a follow-up inspection.
      </Alert>
    </>
  )
}
