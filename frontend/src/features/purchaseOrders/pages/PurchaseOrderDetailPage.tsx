import { useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionCard } from '@/components/layout/SectionCard'
import { LoadingState } from '@/components/data/LoadingState'
import { ErrorState } from '@/components/data/ErrorState'
import { StatusBadge } from '@/components/workflow/StatusBadge'
import { useToast } from '@/app/ToastContext'
import { toFriendlyMessage } from '@/utils/errorMessages'
import { usePermission } from '@/permissions/usePermission'
import { useCompanySettings } from '@/features/companySettings/hooks'
import { formatIndianNumber } from '@/utils/indianNumber'
import { usePurchaseOrder, useSetPurchaseOrderStatus } from '../hooks'
import type { PurchaseOrderStatus } from '../types'

const NEXT_STATUS: Record<PurchaseOrderStatus, PurchaseOrderStatus | null> = {
  draft: 'issued',
  issued: 'completed',
  completed: null,
}
const NEXT_STATUS_LABEL: Record<PurchaseOrderStatus, string> = { draft: 'Mark as Issued', issued: 'Mark as Completed', completed: '' }

export function PurchaseOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: po, isLoading, error, refetch } = usePurchaseOrder(id ? Number(id) : undefined)
  const { data: settings } = useCompanySettings()
  const { showToast } = useToast()
  const canManage = usePermission('purchaseOrders:create')
  const setStatus = useSetPurchaseOrderStatus()

  if (isLoading) return <LoadingState rows={5} />
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />
  if (!po) return null

  const nextStatus = NEXT_STATUS[po.status]

  const advanceStatus = async () => {
    if (!nextStatus) return
    try {
      await setStatus.mutateAsync({ id: po.id, status: nextStatus })
      showToast(`Marked as ${nextStatus}.`, 'success')
    } catch (err) {
      showToast(toFriendlyMessage(err), 'error')
    }
  }

  return (
    <>
      <PageHeader
        title={po.poNumber}
        description={po.supplierName}
        actions={
          <div className="flex gap-2 print:hidden">
            <button
              type="button"
              onClick={() => window.print()}
              className="min-h-11 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Print preview
            </button>
            {canManage && nextStatus && (
              <button
                type="button"
                onClick={advanceStatus}
                className="min-h-11 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
              >
                {NEXT_STATUS_LABEL[po.status]}
              </button>
            )}
          </div>
        }
      />

      <div className="mb-2 print:hidden">
        <StatusBadge status={po.status === 'completed' ? 'completed' : po.status === 'issued' ? 'submitted' : 'not_started'} />
      </div>

      <SectionCard>
        <div className="flex flex-col gap-6 text-sm text-gray-800">
          <div className="flex items-start justify-between border-b border-gray-200 pb-4">
            <div>
              <p className="text-lg font-bold text-gray-900">{settings?.companyName ?? 'Reliable Fresh'}</p>
              <p>{settings?.companyAddress}</p>
              <p>GST: {settings?.companyGstNumber}</p>
            </div>
            <div className="text-right">
              <p className="text-base font-semibold">Purchase Order</p>
              <p>{po.poNumber}</p>
              <p>{po.poDate}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="font-semibold text-gray-700">Supplier</p>
              <p>{po.supplierName}</p>
              <p>{po.supplierAddress}</p>
              {po.supplierGst && <p>GST: {po.supplierGst}</p>}
              {po.supplierEmail && <p>{po.supplierEmail}</p>}
            </div>
            <div>
              <p className="font-semibold text-gray-700">Order details</p>
              <p>Payment terms: {po.paymentTerms || '—'}</p>
              <p>Dispatch through: {po.dispatchThrough}</p>
              <p>Destination: {po.destination || '—'}</p>
              <p>Supplier ref.: {po.supplierRef || '—'}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-full divide-y divide-gray-200 text-left">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Particulars</th>
                  <th className="px-3 py-2">HSN</th>
                  <th className="px-3 py-2">Qty (kg)</th>
                  <th className="px-3 py-2">Rate</th>
                  <th className="px-3 py-2">GST %</th>
                  <th className="px-3 py-2">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {po.lineItems.map((item) => (
                  <tr key={item.id}>
                    <td className="px-3 py-2">{item.srNo}</td>
                    <td className="px-3 py-2">{item.particulars}</td>
                    <td className="px-3 py-2">{item.hsnCode}</td>
                    <td className="px-3 py-2">{item.qtyKg}</td>
                    <td className="px-3 py-2">₹{formatIndianNumber(Number(item.rate ?? 0))}</td>
                    <td className="px-3 py-2">{item.gstPercent}%</td>
                    <td className="px-3 py-2">₹{formatIndianNumber(Number(item.amount ?? 0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="ml-auto flex w-full max-w-xs flex-col gap-1 sm:w-64">
            <div className="flex justify-between">
              <span>Assessable value</span>
              <span>₹{formatIndianNumber(Number(po.assessableValue ?? 0))}</span>
            </div>
            <div className="flex justify-between">
              <span>CGST</span>
              <span>₹{formatIndianNumber(Number(po.cgstTotal ?? 0))}</span>
            </div>
            <div className="flex justify-between">
              <span>SGST</span>
              <span>₹{formatIndianNumber(Number(po.sgstTotal ?? 0))}</span>
            </div>
            <div className="flex justify-between">
              <span>Freight</span>
              <span>{po.freight}</span>
            </div>
            <div className="flex justify-between">
              <span>Other charges</span>
              <span>₹{formatIndianNumber(Number(po.otherCharges))}</span>
            </div>
            <div className="flex justify-between border-t border-gray-300 pt-1 font-semibold">
              <span>Grand total</span>
              <span>₹{formatIndianNumber(Number(po.grandTotal ?? 0))}</span>
            </div>
          </div>

          <p className="italic text-gray-600">{po.totalInWords}</p>

          <div className="mt-8 flex justify-end">
            <div className="text-center">
              <p className="mb-8">For {settings?.companyName ?? 'Reliable Fresh'}</p>
              <p className="border-t border-gray-400 pt-1 text-xs text-gray-500">Authorized Signatory</p>
            </div>
          </div>
        </div>
      </SectionCard>
    </>
  )
}
