import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { EntityId } from '@/types/common'
import { packagingApi } from './index'
import type { CreatePackagingInput } from './types'

export const packagingQueryKeys = {
  eligible: ['packaging', 'eligible'] as const,
  all: ['packaging'] as const,
  detail: (id: EntityId | undefined) => ['packaging', id ?? 'unknown'] as const,
}

export function useEligibleHarvestsForPackaging() {
  return useQuery({ queryKey: packagingQueryKeys.eligible, queryFn: packagingApi.listEligibleHarvests })
}

export function usePackagingRecords() {
  return useQuery({ queryKey: packagingQueryKeys.all, queryFn: packagingApi.list })
}

export function usePackagingDetail(id: EntityId | undefined) {
  return useQuery({
    queryKey: packagingQueryKeys.detail(id),
    queryFn: () => packagingApi.getById(id as EntityId),
    enabled: id !== undefined,
  })
}

export function useCreatePackaging() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreatePackagingInput) => packagingApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: packagingQueryKeys.eligible })
      queryClient.invalidateQueries({ queryKey: packagingQueryKeys.all })
    },
  })
}
