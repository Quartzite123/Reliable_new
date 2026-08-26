import { useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionCard } from '@/components/layout/SectionCard'
import { StatusBadge } from '@/components/workflow/StatusBadge'
import { LoadingState } from '@/components/data/LoadingState'
import { ErrorState } from '@/components/data/ErrorState'
import { usePalletDetail } from '../hooks'

export function PalletisationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading, error, refetch } = usePalletDetail(id ? Number(id) : undefined)

  if (isLoading) return <LoadingState rows={4} />
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />
  if (!data) return null

  const { pallet, lots } = data

  return (
    <>
      <PageHeader title={`Pallet ${pallet.palletId}`} description={`${pallet.palletType} · ${pallet.totalBoxes} boxes`} />

      <SectionCard title="Status">
        <StatusBadge status={pallet.status === 'created' ? 'in_progress' : pallet.status === 'pre_cooling' ? 'in_progress' : 'completed'} />
      </SectionCard>

      <SectionCard title="Lots on this pallet" description="A pallet can span multiple lots from different farmers/customers (Business_Rules R35).">
        <ul className="flex flex-col gap-2">
          {lots.map(({ lot, lotId, farmerName, customerName }) => (
            <li key={lot.id} className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
              <div>
                <p className="font-medium text-gray-900">Lot {lotId}</p>
                <p className="text-sm text-gray-500">
                  {farmerName} — {customerName}
                </p>
              </div>
              <p className="text-sm font-semibold text-gray-700">{lot.numBoxes} boxes</p>
            </li>
          ))}
        </ul>
      </SectionCard>
    </>
  )
}
