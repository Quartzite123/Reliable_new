import { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionCard } from '@/components/layout/SectionCard'
import { DataTable, type DataTableColumn } from '@/components/data/DataTable'
import { LoadingState } from '@/components/data/LoadingState'
import { ErrorState } from '@/components/data/ErrorState'
import { EmptyState } from '@/components/data/EmptyState'
import { FormField } from '@/components/forms/FormField'
import { NumberInput } from '@/components/forms/NumberInput'
import { Select } from '@/components/forms/Select'
import { useToast } from '@/app/ToastContext'
import { toFriendlyMessage } from '@/utils/errorMessages'
import { useProducts } from '@/features/itemMaster/hooks'
import { useLowStockAlerts, useOrderCalculator } from '../hooks'
import type { MaterialStockLevel, OrderCalcLine } from '../types'

export function AlertsPage() {
  const { data, isLoading, error, refetch } = useLowStockAlerts()
  const { data: products } = useProducts()
  const { showToast } = useToast()
  const orderCalculator = useOrderCalculator()
  const [productId, setProductId] = useState<number | undefined>()
  const [numContainers, setNumContainers] = useState<number | undefined>()

  // Matches OrderCalculatorPage.tsx's onCalculate — a failed request must
  // never render identically to a successful empty result (same failure
  // mode as the lab-sampling query-side bug, on the mutation side).
  const handleCalculate = async () => {
    if (!productId || !numContainers) return
    try {
      await orderCalculator.mutateAsync({ productId, numContainers })
    } catch (error) {
      showToast(toFriendlyMessage(error), 'error')
    }
  }

  const columns: DataTableColumn<MaterialStockLevel>[] = [
    { key: 'material', header: 'Material', render: (l) => l.materialLabel, isPrimary: true },
    { key: 'stock', header: 'Current stock', render: (l) => `${l.currentStock} ${l.unitOfMeasure}` },
    { key: 'reorder', header: 'Reorder threshold', render: (l) => l.reorderPoint },
  ]

  const orderColumns: DataTableColumn<OrderCalcLine>[] = [
    { key: 'material', header: 'Material', render: (l) => `${l.material.materialType} — ${l.material.variantName}`, isPrimary: true },
    { key: 'required', header: 'Required', render: (l) => l.required },
    { key: 'current', header: 'Current stock', render: (l) => l.currentStock },
    { key: 'toOrder', header: 'To order', render: (l) => l.toOrder },
  ]

  return (
    <>
      <PageHeader title="Low-Stock Alerts" />
      {isLoading && <LoadingState rows={4} />}
      {error && <ErrorState error={error} onRetry={() => refetch()} />}
      {!isLoading && !error && (data?.length ?? 0) === 0 && <EmptyState title="Nothing is below its reorder threshold" />}
      {!isLoading && !error && (data?.length ?? 0) > 0 && (
        <DataTable columns={columns} rows={data ?? []} getRowId={(l) => l.materialId} emptyTitle="Nothing low" />
      )}

      <SectionCard title="Order calculator" description="Planning aid only — not a purchase order. required = qty per container × containers.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormField label="Product" htmlFor="productId">
            <Select
              id="productId"
              placeholder="Select product"
              options={(products ?? []).map((p) => ({ value: p.id, label: `${p.variety} · ${p.packSize} · ${p.complianceType}` }))}
              value={productId ?? ''}
              onChange={(e) => setProductId(e.target.value ? Number(e.target.value) : undefined)}
            />
          </FormField>
          <FormField label="Number of containers" htmlFor="numContainers">
            <NumberInput
              id="numContainers"
              value={numContainers ?? ''}
              onChange={(e) => setNumContainers(e.target.value ? Number(e.target.value) : undefined)}
            />
          </FormField>
          <div className="flex items-end">
            <button
              type="button"
              disabled={!productId || !numContainers || orderCalculator.isPending}
              onClick={handleCalculate}
              className="min-h-11 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
            >
              {orderCalculator.isPending ? 'Calculating...' : 'Calculate'}
            </button>
          </div>
        </div>

        {orderCalculator.data && orderCalculator.data.lines.length > 0 ? (
          <div className="mt-4">
            <DataTable columns={orderColumns} rows={orderCalculator.data.lines} getRowId={(l) => l.material.id} emptyTitle="Nothing to suggest" />
          </div>
        ) : (
          orderCalculator.isSuccess && <EmptyState title="No BOM entries for this product" />
        )}
      </SectionCard>
    </>
  )
}
