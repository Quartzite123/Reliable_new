import { useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionCard } from '@/components/layout/SectionCard'
import { StatusBadge } from '@/components/workflow/StatusBadge'
import { Alert } from '@/components/feedback/Alert'
import { LoadingState } from '@/components/data/LoadingState'
import { ErrorState } from '@/components/data/ErrorState'
import { EmptyState } from '@/components/data/EmptyState'
import { useArrivalQcByHarvest } from '../hooks'

export function ArrivalQcDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading, error, refetch } = useArrivalQcByHarvest(id ? Number(id) : undefined)

  if (isLoading) return <LoadingState rows={4} />
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />
  if (!data) return null

  const { farmerName, plotNumber, harvestDate, record } = data
  const failed = record?.result === 'Fail'

  return (
    <>
      <PageHeader title={`Arrival QC — ${farmerName}`} description={`${plotNumber} · Harvested ${harvestDate}`} />

      <SectionCard title="Inspection">
        {record ? (
          <div className="rounded-lg border border-gray-200 p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-800">Inspected {record.inspectionDate}</p>
              <StatusBadge status={record.result === 'Pass' ? 'passed' : 'failed'} />
            </div>
            <p className="mt-1 text-sm text-gray-600">Overall: {record.overallObservation}</p>
          </div>
        ) : (
          <EmptyState title="No inspection recorded yet" />
        )}

        {failed && (
          <div className="mt-3">
            <Alert variant="error" title="Arrival QC failed">
              This harvest is rejected. Arrival QC is one inspection per harvest and cannot be re-attempted.
            </Alert>
          </div>
        )}
      </SectionCard>
    </>
  )
}
