import { useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionCard } from '@/components/layout/SectionCard'
import { LoadingState } from '@/components/data/LoadingState'
import { ErrorState } from '@/components/data/ErrorState'
import { useHarvest } from '../hooks'

export function HarvestDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading, error, refetch } = useHarvest(id ? Number(id) : undefined)

  if (isLoading) return <LoadingState rows={4} />
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />
  if (!data) return null

  const { harvest, farmerName, plotNumber, seasonYear, trips } = data

  return (
    <>
      <PageHeader title={`Harvest — ${farmerName}`} description={`${plotNumber} · Season ${seasonYear} · ${harvest.harvestDate}`} />

      <SectionCard title="Supervisor">
        <p className="text-sm text-gray-700">
          {harvest.supervisorName}
          {harvest.supervisorContact ? ` · ${harvest.supervisorContact}` : ''}
        </p>
      </SectionCard>

      <SectionCard title={`Vehicle trips (${trips.length})`}>
        <ul className="flex flex-col gap-2">
          {trips.map((trip) => (
            <li key={trip.id} className="rounded-lg border border-gray-200 p-3">
              <p className="font-medium text-gray-900">{trip.vehicleNo}</p>
              <p className="text-sm text-gray-600">
                Driver: {trip.driverName} · Crates: {trip.numCrates} · Est. weight: {trip.approxWeightKg} kg
              </p>
            </li>
          ))}
        </ul>
      </SectionCard>
    </>
  )
}
