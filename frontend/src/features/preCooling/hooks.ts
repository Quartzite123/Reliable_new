import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { EntityId } from '@/types/common'
import { preCoolingApi } from './index'
import type { CompletePreCoolingInput, CreatePreCoolingInput } from './types'

const KEY = ['pre-cooling'] as const
const ELIGIBLE_KEY = ['pre-cooling', 'eligible'] as const

export function useEligiblePalletsForPreCooling() {
  return useQuery({ queryKey: ELIGIBLE_KEY, queryFn: preCoolingApi.listEligiblePallets })
}

export function usePreCoolingRecords() {
  return useQuery({ queryKey: KEY, queryFn: preCoolingApi.list })
}

export function usePreCoolingRecord(id: EntityId | undefined) {
  return useQuery({
    queryKey: [...KEY, id ?? 'unknown'],
    queryFn: () => preCoolingApi.getById(id as EntityId),
    enabled: id !== undefined,
  })
}

export function useCreatePreCooling() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreatePreCoolingInput) => preCoolingApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEY })
      queryClient.invalidateQueries({ queryKey: ELIGIBLE_KEY })
    },
  })
}

export function useCompletePreCooling(id: EntityId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CompletePreCoolingInput) => preCoolingApi.complete(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}
