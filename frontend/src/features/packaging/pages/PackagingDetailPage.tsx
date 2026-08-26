import { useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionCard } from '@/components/layout/SectionCard'
import { ReadOnlyReferenceCard } from '@/components/workflow/ReadOnlyReferenceCard'
import { LoadingState } from '@/components/data/LoadingState'
import { ErrorState } from '@/components/data/ErrorState'
import { usePackagingDetail } from '../hooks'

export function PackagingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading, error, refetch } = usePackagingDetail(id ? Number(id) : undefined)

  if (isLoading) return <LoadingState rows={4} />
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />
  if (!data) return null

  const { record, customerName, traceability } = data

  return (
    <>
      <PageHeader title={`Lot ${record.lotId}`} description={`${customerName} · ${record.packSize} · ${record.complianceType}`} />

      <SectionCard title="Packing details">
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-gray-500">Packing date</dt>
            <dd className="text-sm font-medium text-gray-800">{record.date}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Total weight</dt>
            <dd className="text-sm font-medium text-gray-800">{record.totalWeightKg} kg</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Actual rejection</dt>
            <dd className="text-sm font-medium text-gray-800">
              {record.actualRejectionKg} kg ({record.actualRejectionPct}%)
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Net weight</dt>
            <dd className="text-sm font-medium text-gray-800">{record.netWeightKg} kg</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Boxes / Pallets</dt>
            <dd className="text-sm font-medium text-gray-800">
              {record.numBoxes} boxes / {record.numPallets} pallets
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">GGN number</dt>
            <dd className="text-sm font-medium text-gray-800">{record.ggnNumber}</dd>
          </div>
        </dl>
      </SectionCard>

      <SectionCard title="Traceability" description="Full chain from this lot back to the farmer.">
        <ReadOnlyReferenceCard
          title="Plot & QC history"
          fields={[
            { label: 'Farmer', value: traceability.farmerName },
            { label: 'Plot', value: traceability.plotNumber },
            { label: 'MH Registration Number', value: traceability.mhRegistrationNumber ?? '—' },
            { label: 'Season', value: String(traceability.seasonYear) },
            { label: 'Field QC', value: traceability.fieldQcResult ?? '—' },
            { label: 'Lab result', value: traceability.labResult ?? '—' },
          ]}
        />
      </SectionCard>
    </>
  )
}
