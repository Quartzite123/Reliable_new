import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { EntityId } from '@/types/common'
import { invalidatePipelineEligibility, PIPELINE_ELIGIBILITY_META } from '@/api/pipelineEligibility'
import { arrivalQcApi } from './index'
import type { ArrivalQcInput } from './types'

export const arrivalQcQueryKeys = {
  eligible: ['arrival-qc', 'eligible'] as const,
  all: ['arrival-qc'] as const,
  byHarvest: (harvestId: EntityId | undefined) => ['arrival-qc', 'harvest', harvestId ?? 'unknown'] as const,
}

export function useEligibleHarvestsForArrivalQc() {
  return useQuery({
    queryKey: arrivalQcQueryKeys.eligible,
    queryFn: arrivalQcApi.listEligibleHarvests,
    meta: PIPELINE_ELIGIBILITY_META,
  })
}

export function useArrivalQcRecords() {
  return useQuery({ queryKey: arrivalQcQueryKeys.all, queryFn: arrivalQcApi.list })
}

export function useArrivalQcByHarvest(harvestId: EntityId | undefined) {
  return useQuery({
    queryKey: arrivalQcQueryKeys.byHarvest(harvestId),
    queryFn: () => arrivalQcApi.getByHarvest(harvestId as EntityId),
    enabled: harvestId !== undefined,
  })
}

export function useCreateArrivalQc() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ArrivalQcInput) => arrivalQcApi.create(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: arrivalQcQueryKeys.eligible })
      queryClient.invalidateQueries({ queryKey: arrivalQcQueryKeys.all })
      queryClient.invalidateQueries({ queryKey: arrivalQcQueryKeys.byHarvest(variables.harvestId) })
      // A pass makes the harvest eligible for Packaging.
      invalidatePipelineEligibility(queryClient)
    },
  })
}
