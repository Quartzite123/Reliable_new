import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { EntityId } from '@/types/common'
import { inventoryApi } from './index'
import type { AdjustmentInput, OrderCalcRequest, StockInInput } from './types'

const STOCK_KEY = ['inventory', 'stock-levels'] as const
const ALERTS_KEY = ['inventory', 'alerts'] as const
const MOVEMENTS_KEY = ['inventory', 'movements'] as const

export function useStockLevels() {
  return useQuery({ queryKey: STOCK_KEY, queryFn: inventoryApi.listStockLevels })
}

export function useLowStockAlerts() {
  return useQuery({ queryKey: ALERTS_KEY, queryFn: inventoryApi.listLowStockAlerts })
}

export function useStockMovements() {
  return useQuery({ queryKey: MOVEMENTS_KEY, queryFn: inventoryApi.listMovements })
}

/** Last 20 movements for one material — the Item Master detail page's "Stock History" panel. */
export function useMaterialMovements(materialId: EntityId | undefined) {
  return useQuery({
    queryKey: [...MOVEMENTS_KEY, 'material', materialId ?? 'unknown'],
    queryFn: () => inventoryApi.listMovementsForMaterial(materialId as EntityId),
    enabled: materialId !== undefined,
  })
}

/** POST with a body (product + container count) — a planning aid triggered on demand, not a cached query (CLAUDE.md §8). */
export function useOrderCalculator() {
  return useMutation({ mutationFn: (input: OrderCalcRequest) => inventoryApi.orderCalculator(input) })
}

function useInvalidateInventory() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: STOCK_KEY })
    queryClient.invalidateQueries({ queryKey: ALERTS_KEY })
    queryClient.invalidateQueries({ queryKey: MOVEMENTS_KEY })
  }
}

export function useStockIn() {
  const invalidate = useInvalidateInventory()
  return useMutation({
    mutationFn: (input: StockInInput) => inventoryApi.stockIn(input),
    onSuccess: invalidate,
  })
}

export function useAdjustStock() {
  const invalidate = useInvalidateInventory()
  return useMutation({
    mutationFn: (input: AdjustmentInput) => inventoryApi.adjust(input),
    onSuccess: invalidate,
  })
}
