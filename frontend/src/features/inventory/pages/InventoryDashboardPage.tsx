import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionCard } from '@/components/layout/SectionCard'
import { DataTable, type DataTableColumn } from '@/components/data/DataTable'
import { LoadingState } from '@/components/data/LoadingState'
import { ErrorState } from '@/components/data/ErrorState'
import { Alert } from '@/components/feedback/Alert'
import { usePermission } from '@/permissions/usePermission'
import { getStockStatus, STOCK_STATUS_CLASSES, STOCK_STATUS_LABELS } from '../stockStatus'
import { useLowStockAlerts, useStockLevels, useStockMovements } from '../hooks'
import type { MaterialStockLevel } from '../types'

interface DashboardRow extends MaterialStockLevel {
  lastStockIn: string | null
}

export function InventoryDashboardPage() {
  const navigate = useNavigate()
  const { data, isLoading, error, refetch } = useStockLevels()
  const { data: alerts } = useLowStockAlerts()
  const { data: movements } = useStockMovements()
  const canManage = usePermission('inventory:manage')

  const rows = useMemo<DashboardRow[]>(() => {
    const lastInByMaterial = new Map<number, string>()
    for (const { movement } of movements ?? []) {
      if (movement.movementType !== 'in' || !movement.date) continue
      const materialId = movement.materialId as number
      const existing = lastInByMaterial.get(materialId)
      if (!existing || movement.date > existing) lastInByMaterial.set(materialId, movement.date)
    }

    const withLastIn = (data ?? []).map((level) => ({ ...level, lastStockIn: lastInByMaterial.get(level.materialId as number) ?? null }))

    // Low stock first, per PHASE_MAP.md §12.1 "Current Stock Overview".
    const rank: Record<string, number> = { red: 0, yellow: 1, green: 2 }
    return withLastIn.sort((a, b) => {
      const statusA = getStockStatus(a.currentStock, a.reorderPoint)
      const statusB = getStockStatus(b.currentStock, b.reorderPoint)
      return rank[statusA] - rank[statusB]
    })
  }, [data, movements])

  const summary = useMemo(() => {
    const total = rows.length
    const low = rows.filter((r) => getStockStatus(r.currentStock, r.reorderPoint) === 'red').length
    return { total, low, ok: total - low }
  }, [rows])

  const columns: DataTableColumn<DashboardRow>[] = [
    { key: 'material', header: 'Material', render: (l) => l.materialLabel, isPrimary: true },
    { key: 'stock', header: 'Current stock', render: (l) => `${l.currentStock} ${l.unitOfMeasure}` },
    { key: 'reorder', header: 'Reorder threshold', render: (l) => l.reorderPoint },
    {
      key: 'status',
      header: 'Status',
      render: (l) => {
        const status = getStockStatus(l.currentStock, l.reorderPoint)
        return <span className={STOCK_STATUS_CLASSES[status]}>{STOCK_STATUS_LABELS[status]}</span>
      },
    },
    { key: 'lastStockIn', header: 'Last stock in', render: (l) => l.lastStockIn ?? '—' },
    ...(canManage
      ? [
          {
            key: 'actions',
            header: 'Actions',
            render: (l: DashboardRow) => (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate(`/inventory/stock-in?materialId=${l.materialId}`)
                  }}
                  className="font-medium text-brand-700 underline"
                >
                  Stock in
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate(`/inventory/adjustments?materialId=${l.materialId}`)
                  }}
                  className="font-medium text-gray-700 underline"
                >
                  Adjust
                </button>
              </div>
            ),
          } as DataTableColumn<DashboardRow>,
        ]
      : []),
  ]

  return (
    <>
      <PageHeader
        title="Inventory"
        description="Current stock is always computed from movement history — never edited directly."
        actions={
          canManage && (
            <div className="flex gap-2">
              <Link to="/inventory/stock-in" className="min-h-11 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 flex items-center">
                Stock in
              </Link>
              <Link to="/inventory/adjustments" className="min-h-11 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center">
                Adjustment
              </Link>
            </div>
          )
        }
      />

      <div className="flex flex-wrap gap-3">
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm">
          <span className="text-gray-500">Total materials: </span>
          <span className="font-semibold text-gray-900">{summary.total}</span>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm">
          <span className="text-red-700">Low stock: </span>
          <span className="font-semibold text-red-800">{summary.low}</span>
        </div>
        <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-2 text-sm">
          <span className="text-brand-700">OK: </span>
          <span className="font-semibold text-brand-800">{summary.ok}</span>
        </div>
      </div>

      {alerts && alerts.length > 0 && (
        <Alert variant="warning" title={`${alerts.length} material(s) below reorder threshold`}>
          <Link to="/inventory/alerts" className="font-semibold underline">
            View low-stock alerts
          </Link>
        </Alert>
      )}

      <SectionCard title="Current stock">
        {isLoading && <LoadingState rows={5} />}
        {error && <ErrorState error={error} onRetry={() => refetch()} />}
        {!isLoading && !error && <DataTable columns={columns} rows={rows} getRowId={(l) => l.materialId} emptyTitle="No materials yet" />}
      </SectionCard>

      <div className="flex flex-wrap gap-3 text-sm">
        <Link to="/inventory/movements" className="font-medium text-brand-700 underline">
          Movement history
        </Link>
        <Link to="/inventory/materials" className="font-medium text-brand-700 underline">
          Item Master
        </Link>
      </div>
    </>
  )
}
