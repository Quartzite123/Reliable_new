import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { FilterBar } from '@/components/data/FilterBar'
import { Select } from '@/components/forms/Select'
import { DataTable, type DataTableColumn } from '@/components/data/DataTable'
import { LoadingState } from '@/components/data/LoadingState'
import { ErrorState } from '@/components/data/ErrorState'
import { usePermission } from '@/permissions/usePermission'
import { useCustomers } from '@/features/customers/hooks'
import { getStockStatus, STOCK_STATUS_CLASSES, STOCK_STATUS_LABELS } from '@/features/inventory/stockStatus'
import { useMaterials, useProducts } from '../hooks'
import { MATERIAL_TYPES, type Material, type Product, type ScaleLevel } from '../types'

type Tab = 'materials' | 'products'

export function MaterialsListPage() {
  const navigate = useNavigate()
  const { data: materials, isLoading: loadingMaterials, error, refetch } = useMaterials()
  const { data: products, isLoading: loadingProducts, isError: productsError, error: productsErrorObj, refetch: refetchProducts } = useProducts()
  const { data: customers } = useCustomers()
  const [tab, setTab] = useState<Tab>('materials')
  const [typeFilter, setTypeFilter] = useState('')
  const [scaleFilter, setScaleFilter] = useState<ScaleLevel | ''>('')
  const canManage = usePermission('inventory:manage')

  const filteredMaterials = useMemo(() => {
    const list = (materials ?? []).filter(
      (m) => (!typeFilter || m.materialType === typeFilter) && (!scaleFilter || m.scaleLevel === scaleFilter),
    )
    // Low stock first, per PHASE_MAP.md §12.1 "Current Stock Overview" — materials at/below reorder point float to the top.
    return [...list].sort((a, b) => {
      const statusA = getStockStatus(a.currentStock, a.reorderPoint ?? 0)
      const statusB = getStockStatus(b.currentStock, b.reorderPoint ?? 0)
      const rank: Record<string, number> = { red: 0, yellow: 1, green: 2 }
      return rank[statusA] - rank[statusB]
    })
  }, [materials, typeFilter, scaleFilter])

  const materialColumns: DataTableColumn<Material>[] = useMemo(
    () => [
      { key: 'name', header: 'Material', render: (m) => `${m.materialType} — ${m.variantName}`, isPrimary: true },
      { key: 'unit', header: 'Unit', render: (m) => m.unitOfMeasure },
      { key: 'scale', header: 'Scale', render: (m) => m.scaleLevel.replace('_', ' ') },
      { key: 'stock', header: 'Current stock', render: (m) => m.currentStock },
      { key: 'reorder', header: 'Reorder threshold', render: (m) => m.reorderPoint ?? '—' },
      {
        key: 'stockStatus',
        header: 'Stock level',
        render: (m) => {
          const status = getStockStatus(m.currentStock, m.reorderPoint ?? 0)
          return <span className={STOCK_STATUS_CLASSES[status]}>{STOCK_STATUS_LABELS[status]}</span>
        },
      },
      { key: 'status', header: 'Active', render: (m) => (m.isActive ? 'Active' : 'Inactive') },
    ],
    [],
  )

  const productColumns: DataTableColumn<Product>[] = useMemo(
    () => [
      { key: 'variety', header: 'Variety', render: (p) => p.variety, isPrimary: true },
      { key: 'customer', header: 'Customer', render: (p) => (customers ?? []).find((c) => c.id === p.customerId)?.name ?? '—' },
      { key: 'packSize', header: 'Pack size', render: (p) => p.packSize },
      { key: 'compliance', header: 'Compliance', render: (p) => p.complianceType },
      { key: 'status', header: 'Status', render: (p) => (p.isActive ? 'Active' : 'Inactive') },
    ],
    [customers],
  )

  return (
    <>
      <PageHeader
        title="Item Master"
        actions={
          canManage &&
          tab === 'materials' && (
            <button
              type="button"
              onClick={() => navigate('/inventory/materials/new')}
              className="min-h-11 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
            >
              New material
            </button>
          )
        }
      />

      <FilterBar>
        <button
          type="button"
          onClick={() => setTab('materials')}
          className={
            tab === 'materials'
              ? 'min-h-11 shrink-0 rounded-lg bg-brand-700 px-4 text-sm font-semibold text-white'
              : 'min-h-11 shrink-0 rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700'
          }
        >
          Packing Materials
        </button>
        <button
          type="button"
          onClick={() => setTab('products')}
          className={
            tab === 'products'
              ? 'min-h-11 shrink-0 rounded-lg bg-brand-700 px-4 text-sm font-semibold text-white'
              : 'min-h-11 shrink-0 rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700'
          }
        >
          Finished Products
        </button>
      </FilterBar>

      {tab === 'materials' && (
        <FilterBar>
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            placeholder="All types"
            options={MATERIAL_TYPES.map((t) => ({ value: t, label: t }))}
          />
          <Select
            value={scaleFilter}
            onChange={(e) => setScaleFilter(e.target.value as ScaleLevel | '')}
            placeholder="All scales"
            options={[
              { value: 'per_box', label: 'Per box' },
              { value: 'per_container', label: 'Per container' },
            ]}
          />
        </FilterBar>
      )}

      {tab === 'materials' && (
        <>
          {loadingMaterials && <LoadingState rows={4} />}
          {error && <ErrorState error={error} onRetry={() => refetch()} />}
          {!loadingMaterials && !error && (
            <DataTable
              columns={materialColumns}
              rows={filteredMaterials}
              getRowId={(m) => m.id}
              onRowClick={(m) => navigate(`/inventory/materials/${m.id}`)}
              emptyTitle="No materials yet"
            />
          )}
        </>
      )}

      {tab === 'products' && (
        <>
          {loadingProducts && <LoadingState rows={4} />}
          {productsError && <ErrorState error={productsErrorObj} onRetry={() => refetchProducts()} />}
          {!loadingProducts && !productsError && (
            <DataTable columns={productColumns} rows={products ?? []} getRowId={(p) => p.id} emptyTitle="No products yet" />
          )}
        </>
      )}
    </>
  )
}
