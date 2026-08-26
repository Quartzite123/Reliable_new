import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { EntityId } from '@/types/common'
import { bomApi } from './index'
import type { BomEntryInput, BomEntryUpdateInput } from './types'

const KEY = ['bom'] as const

export function useBomEntries() {
  return useQuery({ queryKey: KEY, queryFn: bomApi.list })
}

export function useBomEntriesByProduct(productId: EntityId | undefined) {
  return useQuery({
    queryKey: [...KEY, 'by-product', productId ?? 'unknown'],
    queryFn: () => bomApi.listByProduct(productId as EntityId),
    enabled: productId !== undefined,
  })
}

export function useBomEntry(id: EntityId | undefined) {
  return useQuery({ queryKey: [...KEY, id ?? 'unknown'], queryFn: () => bomApi.getById(id as EntityId), enabled: id !== undefined })
}

export function useCreateBomEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: BomEntryInput) => bomApi.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}

export function useUpdateBomEntry(id: EntityId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: BomEntryUpdateInput) => bomApi.update(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}
