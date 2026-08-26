import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, type DataTableColumn } from '@/components/data/DataTable'
import { LoadingState } from '@/components/data/LoadingState'
import { ErrorState } from '@/components/data/ErrorState'
import { useStockMovements } from '../hooks'
import type { StockMovementRow } from '../types'

const MOVEMENT_LABELS: Record<string, string> = { in: 'Stock In', auto_out: 'Auto Deducted (Packaging)', adjustment: 'Adjustment' }

export function MovementsPage() {
  const { data, isLoading, error, refetch } = useStockMovements()

  const columns: DataTableColumn<StockMovementRow>[] = [
    { key: 'material', header: 'Material', render: (r) => r.materialLabel, isPrimary: true },
    { key: 'type', header: 'Type', render: (r) => MOVEMENT_LABELS[r.movement.movementType] },
    { key: 'quantity', header: 'Quantity', render: (r) => (r.movement.quantity > 0 ? `+${r.movement.quantity}` : r.movement.quantity) },
    { key: 'date', header: 'Date', render: (r) => r.movement.date },
    { key: 'reference', header: 'Reference / Reason', render: (r) => r.movement.reference ?? r.movement.reason ?? r.movement.supplierName ?? '—' },
  ]

  return (
    <>
      <PageHeader title="Movement History" description="Full audit trail — stock in, auto-deductions from packaging, and manual adjustments." />
      {isLoading && <LoadingState rows={5} />}
      {error && <ErrorState error={error} onRetry={() => refetch()} />}
      {!isLoading && !error && (
        <DataTable columns={columns} rows={data ?? []} getRowId={(r) => r.movement.id} emptyTitle="No stock movements yet" />
      )}
    </>
  )
}
