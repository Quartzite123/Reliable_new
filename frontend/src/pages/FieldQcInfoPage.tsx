import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Alert } from '@/components/feedback/Alert'

/**
 * Field QC is recorded on the combined Plot + Field QC screen (Business_Rules
 * R15a) for a brand-new plot, or from a plot's own detail page otherwise —
 * this route exists (prompt.md §7) but just points workers to the right
 * place instead of duplicating either form. Updated 2026-09-03: a plot's
 * detail page can now record Field QC for any registration that doesn't
 * have one yet, not only a follow-up after a failure — see PlotDetailPage's
 * "Record Field QC" action. Keep this wording in sync with what that page
 * can actually do; it was wrong once already (used to promise "log a
 * follow-up inspection" as if that were the only option there).
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
        to register a new plot with its Field QC, or open an existing plot to record Field QC for any of its
        registrations that don't have one yet — including a follow-up after a failed inspection.
      </Alert>
    </>
  )
}
