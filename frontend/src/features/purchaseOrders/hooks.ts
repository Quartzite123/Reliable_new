import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { EntityId } from '@/types/common'
import { purchaseOrdersApi } from './index'
import type { CreatePurchaseOrderInput, PurchaseOrderStatus } from './types'

const KEY = ['purchase-orders'] as const

export function useSuppliers() {
  return useQuery({ queryKey: ['purchase-orders', 'suppliers'], queryFn: purchaseOrdersApi.listSuppliers })
}

export function usePurchaseOrders() {
  return useQuery({ queryKey: KEY, queryFn: purchaseOrdersApi.list })
}

export function usePurchaseOrder(id: EntityId | undefined) {
  return useQuery({
    queryKey: [...KEY, id ?? 'unknown'],
    queryFn: () => purchaseOrdersApi.getById(id as EntityId),
    enabled: id !== undefined,
  })
}

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreatePurchaseOrderInput) => purchaseOrdersApi.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}

export function useSetPurchaseOrderStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: EntityId; status: PurchaseOrderStatus }) => purchaseOrdersApi.setStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}
