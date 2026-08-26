import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, type DataTableColumn } from '@/components/data/DataTable'
import { LoadingState } from '@/components/data/LoadingState'
import { ErrorState } from '@/components/data/ErrorState'
import { usePermission } from '@/permissions/usePermission'
import { usePurchaseOrders } from '../hooks'
import type { PurchaseOrder } from '../types'

export function PurchaseOrdersListPage() {
  const navigate = useNavigate()
  const { data, isLoading, error, refetch } = usePurchaseOrders()
  const canCreate = usePermission('purchaseOrders:create')

  const columns: DataTableColumn<PurchaseOrder>[] = [
    { key: 'poNumber', header: 'PO Number', render: (po) => po.poNumber, isPrimary: true },
    { key: 'supplier', header: 'Supplier', render: (po) => po.supplierName },
    { key: 'date', header: 'Date', render: (po) => po.poDate },
    { key: 'total', header: 'Grand total', render: (po) => `₹${Number(po.grandTotal ?? 0).toFixed(2)}` },
    { key: 'status', header: 'Status', render: (po) => po.status.charAt(0).toUpperCase() + po.status.slice(1) },
  ]

  return (
    <>
      <PageHeader
        title="Purchase Orders"
        description="Farm inputs (fertilizer/agro-chemical) only."
        actions={
          canCreate && (
            <button
              type="button"
              onClick={() => navigate('/purchase-orders/new')}
              className="min-h-11 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
            >
              New purchase order
            </button>
          )
        }
      />

      {isLoading && <LoadingState rows={4} />}
      {error && <ErrorState error={error} onRetry={() => refetch()} />}
      {!isLoading && !error && (
        <DataTable
          columns={columns}
          rows={data ?? []}
          getRowId={(po) => po.id}
          onRowClick={(po) => navigate(`/purchase-orders/${po.id}`)}
          emptyTitle="No purchase orders yet"
        />
      )}
    </>
  )
}
