import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { EntityId } from '@/types/common'
import { farmersApi } from './index'
import type { CreateFarmerInput, SaveBankDetailsInput, UpdateFarmerInput } from './types'

export const farmersQueryKeys = {
  all: ['farmers'] as const,
  search: (query: string) => ['farmers', 'search', query] as const,
  detail: (id: EntityId | undefined) => ['farmers', id ?? 'unknown'] as const,
  bankDetails: (farmerId: EntityId | undefined) => ['farmers', farmerId ?? 'unknown', 'bank-details'] as const,
}

export function useFarmerSearch(query: string) {
  return useQuery({
    queryKey: farmersQueryKeys.search(query),
    queryFn: () => farmersApi.search(query),
    enabled: query.trim().length > 0,
  })
}

export function useFarmers() {
  return useQuery({ queryKey: farmersQueryKeys.all, queryFn: farmersApi.list })
}

export function useFarmer(id: EntityId | undefined) {
  return useQuery({
    queryKey: farmersQueryKeys.detail(id),
    queryFn: () => farmersApi.getById(id as EntityId),
    enabled: id !== undefined,
  })
}

export function useCreateFarmer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateFarmerInput) => farmersApi.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: farmersQueryKeys.all }),
  })
}

export function useUpdateFarmer(id: EntityId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateFarmerInput) => farmersApi.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: farmersQueryKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: farmersQueryKeys.all })
    },
  })
}

export function useBankDetails(farmerId: EntityId | undefined) {
  return useQuery({
    queryKey: farmersQueryKeys.bankDetails(farmerId),
    queryFn: () => farmersApi.getBankDetails(farmerId as EntityId),
    enabled: farmerId !== undefined,
  })
}

export function useSaveBankDetails(farmerId: EntityId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: SaveBankDetailsInput) => farmersApi.saveBankDetails(farmerId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: farmersQueryKeys.bankDetails(farmerId) }),
  })
}
