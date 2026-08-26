import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { EntityId } from '@/types/common'
import { palletisationApi } from './index'
import type { CreatePalletInput } from './types'

const KEY = ['palletisation'] as const
const AVAILABLE_KEY = ['palletisation', 'available-lots'] as const

export function useAvailableLots() {
  return useQuery({ queryKey: AVAILABLE_KEY, queryFn: palletisationApi.listAvailableLots })
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
    },
  })
}
