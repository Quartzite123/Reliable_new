import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { EntityId } from '@/types/common'
import { invalidatePipelineEligibility } from '@/api/pipelineEligibility'
import { plotsApi } from './index'
import type { FollowUpFieldQcInput, RegisterPlotWithFieldQcInput } from './types'

export const plotsQueryKeys = {
  all: ['plots'] as const,
  byFarmer: (farmerId: EntityId | undefined) => ['plots', 'by-farmer', farmerId ?? 'unknown'] as const,
  detail: (plotId: EntityId | undefined) => ['plots', plotId ?? 'unknown'] as const,
}

export function usePlotsByFarmer(farmerId: EntityId | undefined) {
  return useQuery({
    queryKey: plotsQueryKeys.byFarmer(farmerId),
    queryFn: () => plotsApi.listByFarmer(farmerId as EntityId),
    enabled: farmerId !== undefined,
  })
}

export function usePlots() {
  return useQuery({ queryKey: plotsQueryKeys.all, queryFn: plotsApi.list })
}

export function usePlotDetail(plotId: EntityId | undefined) {
  return useQuery({
    queryKey: plotsQueryKeys.detail(plotId),
    queryFn: () => plotsApi.getDetail(plotId as EntityId),
    enabled: plotId !== undefined,
  })
}

export function useRegisterPlotWithFieldQc() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: RegisterPlotWithFieldQcInput) => plotsApi.registerWithFieldQc(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: plotsQueryKeys.byFarmer(variables.farmerId) })
      queryClient.invalidateQueries({ queryKey: plotsQueryKeys.all })
      // A Pass result makes the registration eligible for lab sampling.
      invalidatePipelineEligibility(queryClient)
    },
  })
}

export function useSubmitFollowUpFieldQc(plotId: EntityId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: FollowUpFieldQcInput) => plotsApi.submitFollowUpFieldQc(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: plotsQueryKeys.detail(plotId) })
      // Same as above — this covers both the first-ever Field QC (via
      // FieldQcRecordForm when qcHistory is empty) and a genuine
      // follow-up-after-fail, since both go through this one mutation.
      invalidatePipelineEligibility(queryClient)
    },
  })
}
