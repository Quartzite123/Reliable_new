import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { EntityId } from '@/types/common'
import { invalidatePipelineEligibility, PIPELINE_ELIGIBILITY_META } from '@/api/pipelineEligibility'
import { packagingApi } from './index'
import type { CreatePackagingInput } from './types'

export const packagingQueryKeys = {
  eligible: ['packaging', 'eligible'] as const,
  all: ['packaging'] as const,
  detail: (id: EntityId | undefined) => ['packaging', id ?? 'unknown'] as const,
}

export function useEligibleHarvestsForPackaging() {
  return useQuery({
    queryKey: packagingQueryKeys.eligible,
    queryFn: packagingApi.listEligibleHarvests,
    meta: PIPELINE_ELIGIBILITY_META,
  })
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
      // A new lot becomes available for palletisation. This is the case
      // that used to go through listAvailableLots()'s separate,
      // uncached-by-key fetch path — tagging that query (see
      // palletisation/hooks.ts) brings it onto this same mechanism rather
      // than needing a special case.
      invalidatePipelineEligibility(queryClient)
    },
  })
}
