import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionCard } from '@/components/layout/SectionCard'
import { FilterBar } from '@/components/data/FilterBar'
import { Select } from '@/components/forms/Select'
import { DataTable, type DataTableColumn } from '@/components/data/DataTable'
import { LoadingState } from '@/components/data/LoadingState'
import { ErrorState } from '@/components/data/ErrorState'
import { EmptyState } from '@/components/data/EmptyState'
import { usePermission } from '@/permissions/usePermission'
import { useToast } from '@/app/ToastContext'
import { toFriendlyMessage } from '@/utils/errorMessages'
import { useCustomers } from '@/features/customers/hooks'
import { useProducts, useUpdateProduct } from '../hooks'
import type { Product } from '../types'

/** Per-row deactivate needs its own `useUpdateProduct(id)` instance — hooks can't be called conditionally, so this is a tiny row component. */
function DeactivateButton({ product }: { product: Product }) {
  const { showToast } = useToast()
  const updateProduct = useUpdateProduct(product.id)

  return (
    <button
      type="button"
      onClick={async (e) => {
        e.stopPropagation()
        try {
          await updateProduct.mutateAsync({ isActive: !product.isActive })
          showToast(product.isActive ? 'Combination deactivated.' : 'Combination reactivated.', 'success')
        } catch (error) {
          showToast(toFriendlyMessage(error), 'error')
        }
      }}
      className={product.isActive ? 'font-medium text-red-700 underline' : 'font-medium text-brand-700 underline'}
    >
      {product.isActive ? 'Deactivate' : 'Reactivate'}
    </button>
  )
}

export function ProductCombinationsListPage() {
  const navigate = useNavigate()
  const { data, isLoading, error, refetch } = useProducts()
  const { data: customers } = useCustomers()
  const canManage = usePermission('inventory:manage')
  const [varietyFilter, setVarietyFilter] = useState('')
  const [customerFilter, setCustomerFilter] = useState('')

  const products = data ?? []

  const varietyOptions = useMemo(
    () => Array.from(new Set((data ?? []).map((p) => p.variety))).sort((a, b) => a.localeCompare(b)),
    [data],
  )

  const filtered = products.filter(
    (p) => (!varietyFilter || p.variety === varietyFilter) && (!customerFilter || p.customerId === Number(customerFilter)),
  )

  const groups = useMemo(() => {
    const byVariety = new Map<string, Product[]>()
    for (const product of filtered) {
      const list = byVariety.get(product.variety) ?? []
      list.push(product)
      byVariety.set(product.variety, list)
    }
    return Array.from(byVariety.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [filtered])

  const columns: DataTableColumn<Product>[] = [
    { key: 'customer', header: 'Customer', render: (p) => (customers ?? []).find((c) => c.id === p.customerId)?.name ?? '—', isPrimary: true },
    { key: 'packSize', header: 'Pack size', render: (p) => p.packSize },
    { key: 'compliance', header: 'Compliance', render: (p) => p.complianceType },
    { key: 'status', header: 'Status', render: (p) => (p.isActive ? 'Active' : 'Inactive') },
    ...(canManage ? [{ key: 'actions', header: 'Actions', render: (p: Product) => <DeactivateButton product={p} /> } as DataTableColumn<Product>] : []),
  ]

  return (
    <>
      <PageHeader
        title="Product Combinations"
        description="Valid variety + customer + pack size + compliance combinations. Powers the cascading dropdown in Packaging."
        actions={
          canManage && (
            <button
              type="button"
              onClick={() => navigate('/inventory/products/new')}
              className="min-h-11 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
            >
              Add combination
            </button>
          )
        }
      />

      <FilterBar>
        <Select
          value={varietyFilter}
          onChange={(e) => setVarietyFilter(e.target.value)}
          placeholder="All varieties"
          options={varietyOptions.map((v) => ({ value: v, label: v }))}
        />
        <Select
          value={customerFilter}
          onChange={(e) => setCustomerFilter(e.target.value)}
          placeholder="All customers"
          options={(customers ?? []).map((c) => ({ value: c.id, label: c.name }))}
        />
      </FilterBar>

      {isLoading && <LoadingState rows={4} />}
      {error && <ErrorState error={error} onRetry={() => refetch()} />}
      {!isLoading && !error && groups.length === 0 && <EmptyState title="No product combinations yet" />}

      {!isLoading &&
        !error &&
        groups.map(([variety, rows]) => (
          <SectionCard key={variety} title={variety}>
            <DataTable
              columns={columns}
              rows={rows}
              getRowId={(p) => p.id}
              onRowClick={canManage ? (p) => navigate(`/inventory/products/${p.id}`) : undefined}
              emptyTitle="No combinations"
            />
          </SectionCard>
        ))}
    </>
  )
}
