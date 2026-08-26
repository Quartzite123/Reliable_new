import { Link, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionCard } from '@/components/layout/SectionCard'
import { LoadingState } from '@/components/data/LoadingState'
import { ErrorState } from '@/components/data/ErrorState'
import { Alert } from '@/components/feedback/Alert'
import { useWeighingRecord } from '../hooks'

function Field({ label, value }: { label: string; value: string | number | undefined }) {
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="text-sm font-medium text-gray-800">{value ?? '—'}</dd>
    </div>
  )
}

export function WeighingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading, error, refetch } = useWeighingRecord(id ? Number(id) : undefined)

  if (isLoading) return <LoadingState rows={4} />
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />
  if (!data) return null

  const { record, farmerName, vehicleNo } = data

  return (
    <>
      <PageHeader
        title={`Weighing — ${farmerName ?? `Vehicle Trip #${record.vehicleTripId}`}`}
        description={`${vehicleNo ?? 'Unknown vehicle'} · ${record.date ?? ''}`}
        actions={
          <Link
            to={`/weighing/${record.id}/print`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center rounded-lg border border-gray-300 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Print Slip
          </Link>
        }
      />

      {record.crateMismatch && (
        <Alert variant="error" title="Crate count does not match">
          {record.crateMismatchMessage ?? 'The recorded crate count does not match the harvest record.'}
        </Alert>
      )}

      <SectionCard title="Reference">
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Farmer name" value={farmerName} />
          <Field label="Vehicle no." value={vehicleNo} />
          <Field label="Date" value={record.date} />
        </dl>
      </SectionCard>

      <SectionCard title="Slip details">
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Slip Serial No." value={record.slipSerialNo} />
          <Field label="Load Id" value={record.loadId} />
          <Field label="Harvester No." value={record.harvesterNo} />
          <Field label="No. Crt Reci" value={record.noCrtReci} />
          <Field label="Knitting" value={record.knitting} />
          <Field label="Produce Type" value={record.produceType} />
          <Field label="Average Size" value={record.averageSize} />
          <Field label="Average Sugar (TSS)" value={record.averageSugar} />
          <Field label="Supervisor" value={record.supervisorName} />
        </dl>
      </SectionCard>

      <SectionCard title="Weight calculation">
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Crate Count" value={record.crateCountAtWeighing ?? record.numCrates} />
          <Field label="Gross Weight" value={record.grossWeightKg ? `${record.grossWeightKg} kg` : undefined} />
          <Field
            label="Tare"
            value={
              record.tareWeightKg
                ? `${record.crateCountAtWeighing ?? record.numCrates ?? '—'} × ${record.crateTareWeightKg ?? '—'} = ${record.tareWeightKg} kg`
                : undefined
            }
          />
          <Field label="Net Fruit Weight (Gross Weight)" value={record.netFruitWeightKg ? `${record.netFruitWeightKg} kg` : `${record.totalWeightKg} kg`} />
          <Field label="Contract rejection %" value={record.rejectionPct ? `${record.rejectionPct}%` : undefined} />
          <Field label="Actual rejection %" value={record.actualRejectionPct ? `${record.actualRejectionPct}%` : undefined} />
          <Field label="Rejection weight" value={record.rejectionKg ? `${record.rejectionKg} kg` : undefined} />
          <Field label="Net Payable Weight" value={record.netWeightKg ? `${record.netWeightKg} kg` : undefined} />
        </dl>
      </SectionCard>

      {record.slipPhotoUrl && (
        <SectionCard title="Slip photo">
          <img src={record.slipPhotoUrl} alt="Weighing slip" className="max-h-96 rounded-lg border border-gray-200" />
        </SectionCard>
      )}
    </>
  )
}
