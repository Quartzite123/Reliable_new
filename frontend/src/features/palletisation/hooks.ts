import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { EntityId } from '@/types/common'
import { invalidatePipelineEligibility, PIPELINE_ELIGIBILITY_META } from '@/api/pipelineEligibility'
import { palletisationApi } from './index'
import type { CreatePalletInput } from './types'

const KEY = ['palletisation'] as const
const AVAILABLE_KEY = ['palletisation', 'available-lots'] as const

export function useAvailableLots() {
  return useQuery({ queryKey: AVAILABLE_KEY, queryFn: palletisationApi.listAvailableLots, meta: PIPELINE_ELIGIBILITY_META })
}

export function usePallets() {
  return useQuery({ queryKey: KEY, queryFn: palletisationApi.list })
}

export function usePalletDetail(id: EntityId | undefined) {
  return useQuery({
    queryKey: [...KEY, id ?? 'unknown'],
    queryFn: () => palletisationApi.getById(id as EntityId),
    enabled: id !== undefined,
  })
}

export function useCreatePallet() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreatePalletInput) => palletisationApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEY })
      queryClient.invalidateQueries({ queryKey: AVAILABLE_KEY })
      // A new pallet (a) removes boxes from packaging's remaining-boxes
      // count (can push a harvest out of packaging's eligible list once
      // fully allocated and Palletised) and (b) is itself now eligible
      // for pre-cooling. Found this second case while building this
      // mechanism — it wasn't in the original six-gap list.
      invalidatePipelineEligibility(queryClient)
    },
  })
}
