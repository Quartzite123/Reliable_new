import { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionCard } from '@/components/layout/SectionCard'
import { FormField } from '@/components/forms/FormField'
import { NumberInput } from '@/components/forms/NumberInput'
import { Select } from '@/components/forms/Select'
import { DataTable, type DataTableColumn } from '@/components/data/DataTable'
import { EmptyState } from '@/components/data/EmptyState'
import { useToast } from '@/app/ToastContext'
import { toFriendlyMessage } from '@/utils/errorMessages'
import { useCustomers } from '@/features/customers/hooks'
import { useProducts } from '@/features/itemMaster/hooks'
import type { Material } from '@/features/itemMaster'
import { inventoryApi } from '../index'
import type { OrderCalcResponse } from '../types'

interface OrderRow {
  key: string
  productId?: number
  numContainers?: number
}

interface AggregatedLine {
  material: Material
  required: number
  currentStock: number
  toOrder: number
}

let nextRowKey = 1

/**
 * The real endpoint (`POST /inventory/order-calculator`) takes one product +
 * container count per call — there's no batch/multi-product variant
 * (verified via openapi.json: `OrderCalcRequest` is `{product_id,
 * num_containers}` only). Multiple combinations are supported here by
 * calling it once per row and aggregating client-side: `required` sums
 * across rows per material, then `to_order` is recomputed as
 * `max(0, total_required - current_stock)` — summing each row's own
 * `to_order` instead would double-subtract the shared current stock.
 */
function aggregate(results: OrderCalcResponse[]): AggregatedLine[] {
  const byMaterial = new Map<number, { material: Material; required: number; currentStock: number }>()
  for (const result of results) {
    for (const line of result.lines) {
      const id = line.material.id as number
      const existing = byMaterial.get(id)
      if (existing) {
        existing.required += line.required
      } else {
        byMaterial.set(id, { material: line.material, required: line.required, currentStock: line.currentStock })
      }
    }
  }
  return Array.from(byMaterial.values())
    .map((m) => ({ ...m, toOrder: Math.max(0, m.required - m.currentStock) }))
    .sort((a, b) => b.toOrder - a.toOrder)
}

export function OrderCalculatorPage() {
  const { showToast } = useToast()
  const { data: products } = useProducts()
  const { data: customers } = useCustomers()
  const [rows, setRows] = useState<OrderRow[]>([{ key: String(nextRowKey++) }])
  const [isCalculating, setIsCalculating] = useState(false)
  const [lines, setLines] = useState<AggregatedLine[] | null>(null)

  const productOptions = (products ?? [])
    .filter((p) => p.isActive)
    .map((p) => ({
      value: p.id,
      label: `${p.variety} — ${(customers ?? []).find((c) => c.id === p.customerId)?.name ?? '?'} — ${p.packSize} (${p.complianceType})`,
    }))

  const updateRow = (key: string, patch: Partial<OrderRow>) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  }

  const addRow = () => setRows((prev) => [...prev, { key: String(nextRowKey++) }])
  const removeRow = (key: string) => setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== key) : prev))

  const validRows = rows.filter((r): r is Required<OrderRow> => r.productId !== undefined && !!r.numContainers && r.numContainers > 0)

  const onCalculate = async () => {
    if (validRows.length === 0) return
    setIsCalculating(true)
    try {
      const results = await Promise.all(
        validRows.map((r) => inventoryApi.orderCalculator({ productId: r.productId, numContainers: r.numContainers })),
      )
      setLines(aggregate(results))
    } catch (error) {
      showToast(toFriendlyMessage(error), 'error')
    } finally {
      setIsCalculating(false)
    }
  }

  const onDownload = () => {
    if (!lines) return
    const toOrder = lines.filter((l) => l.toOrder > 0)
    sessionStorage.setItem('orderSheetLines', JSON.stringify(toOrder))
    window.open('/inventory/order-sheet', '_blank')
  }

  const columns: DataTableColumn<AggregatedLine>[] = [
    { key: 'material', header: 'Material', render: (l) => `${l.material.materialType} — ${l.material.variantName}`, isPrimary: true },
    { key: 'required', header: 'Total needed', render: (l) => l.required },
    { key: 'stock', header: 'In stock', render: (l) => l.currentStock },
    {
      key: 'toOrder',
      header: 'To order',
      render: (l) => <span className={l.toOrder > 0 ? 'font-semibold text-red-700' : undefined}>{l.toOrder}</span>,
    },
  ]

  return (
    <>
      <PageHeader
        title="Order Calculator"
        description="Planning aid only — not a purchase order. Add a row per product combination for pre-season bulk ordering across multiple customers at once."
      />

      <SectionCard title="Planned containers">
        <div className="flex flex-col gap-3">
          {rows.map((row) => (
            <div key={row.key} className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
              <FormField label="Product combination" htmlFor={`product-${row.key}`}>
                <Select
                  id={`product-${row.key}`}
                  placeholder="Select product"
                  options={productOptions}
                  value={row.productId ?? ''}
                  onChange={(e) => updateRow(row.key, { productId: e.target.value ? Number(e.target.value) : undefined })}
                />
              </FormField>
              <FormField label="Planned containers" htmlFor={`containers-${row.key}`}>
                <NumberInput
                  id={`containers-${row.key}`}
                  value={row.numContainers ?? ''}
                  onChange={(e) => updateRow(row.key, { numContainers: e.target.value ? Number(e.target.value) : undefined })}
                />
              </FormField>
              {rows.length > 1 && (
                <button type="button" onClick={() => removeRow(row.key)} className="min-h-11 rounded-lg border border-gray-300 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Remove
                </button>
              )}
            </div>
          ))}

          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={addRow} className="min-h-11 rounded-lg border-2 border-brand-700 px-4 text-sm font-semibold text-brand-800 hover:bg-brand-50">
              + Add another combination
            </button>
            <button
              type="button"
              disabled={validRows.length === 0 || isCalculating}
              onClick={onCalculate}
              className="min-h-11 rounded-lg bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
            >
              {isCalculating ? 'Calculating...' : 'Calculate'}
            </button>
          </div>
        </div>
      </SectionCard>

      {lines && (
        <SectionCard title="Material requirements" description="Materials that need ordering are highlighted.">
          {lines.length === 0 ? (
            <EmptyState title="No BOM entries for the selected combinations" />
          ) : (
            <>
              <DataTable columns={columns} rows={lines} getRowId={(l) => l.material.id} emptyTitle="Nothing to suggest" />
              <div className="mt-4">
                <button
                  type="button"
                  disabled={lines.every((l) => l.toOrder === 0)}
                  onClick={onDownload}
                  className="min-h-11 rounded-lg bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
                >
                  Download order sheet
                </button>
              </div>
            </>
          )}
        </SectionCard>
      )}
    </>
  )
}
