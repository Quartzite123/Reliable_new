import { useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionCard } from '@/components/layout/SectionCard'
import { ReadOnlyReferenceCard } from '@/components/workflow/ReadOnlyReferenceCard'
import { StatusBadge } from '@/components/workflow/StatusBadge'
import { LoadingState } from '@/components/data/LoadingState'
import { ErrorState } from '@/components/data/ErrorState'
import { useLabSample } from '../hooks'

export function LabSampleDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading, error, refetch } = useLabSample(id ? Number(id) : undefined)

  if (isLoading) return <LoadingState rows={4} />
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />
  if (!data) return null

  const { sample, reference } = data

  return (
    <>
      <PageHeader
        title={`Lab Sample — ${reference.farmerName}`}
        description={`${reference.plotNumber} · Season ${reference.seasonYear}`}
      />

      <div className="flex items-center gap-3">
        <StatusBadge status={sample.result === 'Pass' ? 'passed' : 'failed'} />
      </div>

      <SectionCard title="Plot reference">
        <ReadOnlyReferenceCard
          title="From plot record"
          fields={[
            { label: 'MH Registration Number', value: reference.mhRegistrationNumber ?? '—' },
            { label: 'Variety', value: reference.variety ?? '—' },
            { label: 'Village/Taluka', value: `${reference.village ?? '—'}, ${reference.taluka ?? '—'}` },
          ]}
        />
      </SectionCard>

      <SectionCard title="Lab sample">
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-gray-500">Lab</dt>
            <dd className="text-sm font-medium text-gray-800">{sample.labName}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Sampling date</dt>
            <dd className="text-sm font-medium text-gray-800">{sample.samplingDate}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Seal number</dt>
            <dd className="text-sm font-medium text-gray-800">{sample.sealNo}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Variety confirmed</dt>
            <dd className="text-sm font-medium text-gray-800">{sample.varietyConfirmed}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">TSS / MRL value</dt>
            <dd className="text-sm font-medium text-gray-800">{sample.tssValue}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Yield (4B)</dt>
            <dd className="text-sm font-medium text-gray-800">{sample.yield4bMt} MT</dd>
          </div>
        </dl>
        {sample.remark && <p className="mt-3 text-sm text-gray-600">Remarks: {sample.remark}</p>}
      </SectionCard>
    </>
  )
}
