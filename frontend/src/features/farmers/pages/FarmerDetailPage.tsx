import { Link, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionCard } from '@/components/layout/SectionCard'
import { LoadingState } from '@/components/data/LoadingState'
import { ErrorState } from '@/components/data/ErrorState'
import { EmptyState } from '@/components/data/EmptyState'
import { Alert } from '@/components/feedback/Alert'
import { StatusBadge } from '@/components/workflow/StatusBadge'
import { usePermission } from '@/permissions/usePermission'
import { seasonStatusToBadgeStatus } from '@/types/season'
import { usePlotsByFarmer } from '@/features/plots/hooks'
import { useBankDetails, useFarmer } from '../hooks'

export function FarmerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const farmerId = id ? Number(id) : undefined
  const { data: farmer, isLoading, error, refetch } = useFarmer(farmerId)
  const {
    data: bankDetails,
    isError: bankDetailsError,
    error: bankDetailsErrorObj,
    refetch: refetchBankDetails,
  } = useBankDetails(farmerId)
  const { data: plots } = usePlotsByFarmer(farmerId)
  const canEdit = usePermission('farmers:create')
  const canAddPlot = usePermission('plots:create')

  if (isLoading) return <LoadingState rows={4} />
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />
  if (!farmer) return null

  return (
    <>
      <PageHeader
        title={farmer.name}
        actions={
          canEdit && (
            <Link
              to={`/farmers/${farmer.id}/edit`}
              className="min-h-11 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center"
            >
              Edit
            </Link>
          )
        }
      />

      <SectionCard title="Farmer details">
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-gray-500">Address</dt>
            <dd className="text-sm font-medium text-gray-800">{farmer.address}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Mobile</dt>
            <dd className="text-sm font-medium text-gray-800">{farmer.mobile}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Status</dt>
            <dd className="text-sm font-medium text-gray-800">{farmer.status === 'active' ? 'Active' : 'Inactive'}</dd>
          </div>
        </dl>
      </SectionCard>

      <SectionCard title="Bank details">
        {bankDetailsError ? (
          <ErrorState error={bankDetailsErrorObj} onRetry={() => refetchBankDetails()} />
        ) : bankDetails ? (
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-gray-500">Account holder</dt>
              <dd className="text-sm font-medium text-gray-800">{bankDetails.accountHolderName}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Bank</dt>
              <dd className="text-sm font-medium text-gray-800">{bankDetails.bankName}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Account number</dt>
              <dd className="text-sm font-medium text-gray-800">
                {'•'.repeat(Math.max(0, bankDetails.accountNumber.length - 4)) + bankDetails.accountNumber.slice(-4)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">IFSC</dt>
              <dd className="text-sm font-medium text-gray-800">{bankDetails.ifscCode}</dd>
            </div>
          </dl>
        ) : (
          <Alert variant="warning" title="No bank details on file">
            Bank details are required before a Contract can be created for this farmer.
          </Alert>
        )}
        <Link to={`/farmers/${farmer.id}/bank-details`} className="mt-3 inline-block text-sm font-medium text-brand-700 underline">
          {bankDetails ? 'Update bank details' : 'Add bank details'}
        </Link>
      </SectionCard>

      <SectionCard
        title="Plots"
        description="Each plot is registered separately, per season, with its own Field QC."
      >
        {plots && plots.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {plots.map(({ plot, latestRegistration }) => (
              <li key={plot.id}>
                <Link
                  to={`/plots/${plot.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 p-3 hover:border-brand-400 hover:bg-brand-50"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {plot.plotNumber} — {plot.varietyNames?.length ? plot.varietyNames.join(', ') : plot.variety}
                    </p>
                    <p className="text-sm text-gray-500">{plot.village}</p>
                  </div>
                  {latestRegistration && <StatusBadge status={seasonStatusToBadgeStatus(latestRegistration.status)} />}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No plots yet" />
        )}

        {canAddPlot && (
          <Link
            to={`/plots/new?farmerId=${farmer.id}`}
            className="mt-3 inline-flex min-h-11 items-center rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
          >
            Register a plot for this farmer
          </Link>
        )}
      </SectionCard>
    </>
  )
}
