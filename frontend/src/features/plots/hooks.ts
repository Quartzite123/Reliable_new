import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { EntityId } from '@/types/common'
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
    },
  })
}

export function useSubmitFollowUpFieldQc(plotId: EntityId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: FollowUpFieldQcInput) => plotsApi.submitFollowUpFieldQc(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: plotsQueryKeys.detail(plotId) }),
  })
}
