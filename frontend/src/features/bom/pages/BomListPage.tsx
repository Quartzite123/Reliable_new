import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionCard } from '@/components/layout/SectionCard'
import { FormField } from '@/components/forms/FormField'
import { Select } from '@/components/forms/Select'
import { DataTable, type DataTableColumn } from '@/components/data/DataTable'
import { LoadingState } from '@/components/data/LoadingState'
import { ErrorState } from '@/components/data/ErrorState'
import { EmptyState } from '@/components/data/EmptyState'
import { usePermission } from '@/permissions/usePermission'
import { useCustomers } from '@/features/customers/hooks'
import { useProducts } from '@/features/itemMaster/hooks'
import { useBomEntries, useBomEntriesByProduct } from '../hooks'
import type { BomEntryRow } from '../types'

export function BomListPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const productIdParam = searchParams.get('productId')
  const productId = productIdParam ? Number(productIdParam) : undefined
  const canManage = usePermission('bom:manage')

  const { data: products } = useProducts()
  const { data: customers } = useCustomers()
  const { data: allEntries, isError: entriesError, error: entriesErrorObj, refetch: refetchEntries } = useBomEntries()

  const productOptions = (products ?? [])
    .filter((p) => p.isActive)
    .map((p) => ({
      value: p.id,
      label: `${p.variety} — ${(customers ?? []).find((c) => c.id === p.customerId)?.name ?? '?'} — ${p.packSize} (${p.complianceType})`,
    }))

  return (
    <>
      <PageHeader
        title="Bill of Materials"
        description="Grouped by product combination — pick one below to see everything it needs."
        actions={
          canManage &&
          productId !== undefined && (
            <button
              type="button"
              onClick={() => navigate(`/inventory/bom/new?productId=${productId}`)}
              className="min-h-11 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
            >
              Add material to BOM
            </button>
          )
        }
      />

      <SectionCard>
        <FormField label="Product combination" htmlFor="productId">
          <Select
            id="productId"
            placeholder="Select a product combination"
            options={productOptions}
            value={productId ?? ''}
            onChange={(e) => setSearchParams(e.target.value ? { productId: e.target.value } : {})}
          />
        </FormField>
      </SectionCard>

      {productId === undefined ? (
        entriesError ? (
          <ErrorState error={entriesErrorObj} onRetry={() => refetchEntries()} />
        ) : (
          <BomSummary entries={allEntries ?? []} onSelect={(id) => setSearchParams({ productId: String(id) })} />
        )
      ) : (
        <BomEntriesForProduct productId={productId} canManage={canManage} />
      )}
    </>
  )
}

/** No product selected — one row per combination showing how many BOM entries it has, linking into the filtered view. */
function BomSummary({ entries, onSelect }: { entries: BomEntryRow[]; onSelect: (productId: number) => void }) {
  const summary = useMemo(() => {
    const counts = new Map<number, { productId: number; variety: string; customerName: string; packSize: string; count: number }>()
    for (const row of entries) {
      const id = row.productId as number
      const existing = counts.get(id)
      if (existing) {
        existing.count += 1
      } else {
        counts.set(id, { productId: id, variety: row.variety, customerName: row.customerName, packSize: row.packSize, count: 1 })
      }
    }
    return Array.from(counts.values()).sort((a, b) => a.variety.localeCompare(b.variety))
  }, [entries])

  if (summary.length === 0) {
    return <EmptyState title="Select a product combination to view its bill of materials" description="No BOM entries have been created for any combination yet." />
  }

  const columns: DataTableColumn<(typeof summary)[number]>[] = [
    { key: 'product', header: 'Product', render: (r) => `${r.variety} — ${r.packSize}`, isPrimary: true },
    { key: 'customer', header: 'Customer', render: (r) => r.customerName },
    { key: 'count', header: 'Materials in BOM', render: (r) => r.count },
  ]

  return (
    <SectionCard title="All product combinations with a BOM">
      <DataTable columns={columns} rows={summary} getRowId={(r) => r.productId} onRowClick={(r) => onSelect(r.productId)} emptyTitle="Nothing yet" />
    </SectionCard>
  )
}

function BomEntriesForProduct({ productId, canManage }: { productId: number; canManage: boolean }) {
  const navigate = useNavigate()
  const { data, isLoading, error, refetch } = useBomEntriesByProduct(productId)

  const columns: DataTableColumn<BomEntryRow>[] = [
    { key: 'materialType', header: 'Type', render: (r) => r.materialType, isPrimary: true },
    { key: 'variant', header: 'Variant', render: (r) => r.variantName },
    { key: 'scale', header: 'Scale', render: (r) => r.scaleLevel.replace('_', ' ') },
    { key: 'perContainer', header: 'Qty / container', render: (r) => r.entry.qtyPerContainer },
    { key: 'perBox', header: 'Qty / box', render: (r) => r.entry.qtyPerBox ?? '—' },
  ]

  return (
    <SectionCard title="Materials in this BOM">
      {isLoading && <LoadingState rows={4} />}
      {error && <ErrorState error={error} onRetry={() => refetch()} />}
      {!isLoading && !error && (
        <DataTable
          columns={columns}
          rows={data ?? []}
          getRowId={(r) => r.entry.id}
          onRowClick={canManage ? (r) => navigate(`/inventory/bom/${r.entry.id}`) : undefined}
          emptyTitle="No materials in this BOM yet"
          emptyDescription={canManage ? 'Use "Add material to BOM" above to add the first one.' : undefined}
        />
      )}
    </SectionCard>
  )
}
