import { useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionCard } from '@/components/layout/SectionCard'
import { LoadingState } from '@/components/data/LoadingState'
import { ErrorState } from '@/components/data/ErrorState'
import { useContract } from '../hooks'

export function ContractDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading, error, refetch } = useContract(id ? Number(id) : undefined)

  if (isLoading) return <LoadingState rows={4} />
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />
  if (!data) return null

  const { contract, farmerName, plotNumber, variety, seasonYear } = data

  return (
    <>
      <PageHeader
        title={`Contract — ${farmerName}`}
        description={`${plotNumber}${variety ? ` — ${variety}` : ''} · Season ${seasonYear}`}
      />
      <SectionCard title="Terms">
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-gray-500">Contract date</dt>
            <dd className="text-sm font-medium text-gray-800">{contract.contractDate}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Rate per kg</dt>
            <dd className="text-sm font-medium text-gray-800">₹{contract.ratePerKg}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Rejection percentage</dt>
            <dd className="text-sm font-medium text-gray-800">{contract.rejectionPercent}%</dd>
          </div>
        </dl>
        {contract.terms && <p className="mt-3 text-sm text-gray-600">Terms: {contract.terms}</p>}
        {contract.notes && <p className="mt-1 text-sm text-gray-600">Notes: {contract.notes}</p>}
      </SectionCard>
    </>
  )
}
