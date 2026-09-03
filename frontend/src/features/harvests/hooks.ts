import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { EntityId } from '@/types/common'
import { PIPELINE_ELIGIBILITY_META } from '@/api/pipelineEligibility'
import { harvestsApi } from './index'
import type { CreateHarvestInput } from './types'

export const harvestsQueryKeys = {
  eligible: ['harvests', 'eligible'] as const,
  all: ['harvests'] as const,
  detail: (id: EntityId | undefined) => ['harvests', id ?? 'unknown'] as const,
  trips: ['vehicle-trips'] as const,
}

export function useEligiblePlotsForHarvest() {
  return useQuery({
    queryKey: harvestsQueryKeys.eligible,
    queryFn: harvestsApi.listEligiblePlots,
    meta: PIPELINE_ELIGIBILITY_META,
  })
}

export function useHarvests() {
  return useQuery({ queryKey: harvestsQueryKeys.all, queryFn: harvestsApi.list })
}

export function useHarvest(id: EntityId | undefined) {
  return useQuery({
    queryKey: harvestsQueryKeys.detail(id),
    queryFn: () => harvestsApi.getById(id as EntityId),
    enabled: id !== undefined,
  })
}

export function useVehicleTrips() {
  return useQuery({ queryKey: harvestsQueryKeys.trips, queryFn: harvestsApi.listVehicleTrips })
}

export function useCreateHarvest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateHarvestInput) => harvestsApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: harvestsQueryKeys.eligible })
      queryClient.invalidateQueries({ queryKey: harvestsQueryKeys.all })
      queryClient.invalidateQueries({ queryKey: harvestsQueryKeys.trips })
    },
  })
}
