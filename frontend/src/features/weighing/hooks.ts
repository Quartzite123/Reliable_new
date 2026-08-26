import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { EntityId } from '@/types/common'
import { weighingApi } from './index'
import type { CreateWeighingInput } from './types'

export const weighingQueryKeys = {
  context: (vehicleTripId: EntityId | undefined) => ['weighing', 'context', vehicleTripId ?? 'unknown'] as const,
  all: ['weighing'] as const,
  detail: (id: EntityId | undefined) => ['weighing', id ?? 'unknown'] as const,
}

export function useWeighingContext(vehicleTripId: EntityId | undefined) {
  return useQuery({
    queryKey: weighingQueryKeys.context(vehicleTripId),
    queryFn: () => weighingApi.getContext(vehicleTripId as EntityId),
    enabled: vehicleTripId !== undefined,
  })
}

export function useWeighingRecords() {
  return useQuery({ queryKey: weighingQueryKeys.all, queryFn: weighingApi.list })
}

export function useWeighingRecord(id: EntityId | undefined) {
  return useQuery({
    queryKey: weighingQueryKeys.detail(id),
    queryFn: () => weighingApi.getById(id as EntityId),
    enabled: id !== undefined,
  })
}

export function useCreateWeighing() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateWeighingInput) => weighingApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: weighingQueryKeys.all })
      queryClient.invalidateQueries({ queryKey: ['vehicle-trips'] })
    },
  })
}
