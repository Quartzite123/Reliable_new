import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { EntityId } from '@/types/common'
import { invalidatePipelineEligibility } from '@/api/pipelineEligibility'
import { plotsApi } from './index'
import type { FollowUpFieldQcInput, RegisterPlotMultiVarietyInput } from './types'

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

/**
 * Covers both the single-variety and multi-variety registration flow — see
 * plotsApiReal.registerMultipleVarieties. Always invalidates, win or
 * partial-fail: even a partially-failed submission created the plot and at
 * least attempted every variety, so stale plot lists would be wrong either way.
 */
export function useRegisterPlotMultiVariety() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: RegisterPlotMultiVarietyInput) => plotsApi.registerMultipleVarieties(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: plotsQueryKeys.byFarmer(variables.farmerId) })
      queryClient.invalidateQueries({ queryKey: plotsQueryKeys.all })
      // Any variety that passed Field QC is now eligible for lab sampling.
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

/** Add a variety to an existing plot — Varieties management screen. */
export function useAddPlotVariety(plotId: EntityId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { varietyName: string; areaAcres?: number }) =>
      plotsApi.addPlotVariety(plotId, input.varietyName, input.areaAcres),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: plotsQueryKeys.detail(plotId) })
      queryClient.invalidateQueries({ queryKey: plotsQueryKeys.all })
    },
  })
}

/** Correct an existing variety's area — area only, no rename (see plotsApi.updatePlotVariety). */
export function useUpdatePlotVariety(plotId: EntityId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { plotVarietyId: EntityId; areaAcres: number | undefined }) =>
      plotsApi.updatePlotVariety(input.plotVarietyId, input.areaAcres),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: plotsQueryKeys.detail(plotId) })
      queryClient.invalidateQueries({ queryKey: plotsQueryKeys.all })
    },
  })
}

/** Remove a variety from an existing plot — backend 409s if any registration references it (surfaced via toast, not re-validated here). */
export function useRemovePlotVariety(plotId: EntityId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (plotVarietyId: EntityId) => plotsApi.removePlotVariety(plotVarietyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: plotsQueryKeys.detail(plotId) })
      queryClient.invalidateQueries({ queryKey: plotsQueryKeys.all })
    },
  })
}

/**
 * Registers an existing plot_variety for a season — no Field QC collected
 * here (see plotsApiReal.registerVariety); the resulting registration
 * shows up on this same page with PlotDetailPage's own "Record Field QC"
 * action already covering it. No pipeline-eligibility invalidation — a
 * freshly Registered registration isn't eligible for anything downstream
 * until its Field QC passes.
 */
export function useRegisterVariety(plotId: EntityId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { plotVarietyId: EntityId; seasonYear: number }) =>
      plotsApi.registerVariety(plotId, input.plotVarietyId, input.seasonYear),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: plotsQueryKeys.detail(plotId) }),
  })
}
