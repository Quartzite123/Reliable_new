import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { EntityId } from '@/types/common'
import { contractsApi } from './index'
import type { CreateContractInput } from './types'

export const contractsQueryKeys = {
  eligible: ['contracts', 'eligible'] as const,
  prerequisites: (seasonRegistrationId: EntityId | undefined) =>
    ['contracts', 'prerequisites', seasonRegistrationId ?? 'unknown'] as const,
  all: ['contracts'] as const,
  detail: (id: EntityId | undefined) => ['contracts', id ?? 'unknown'] as const,
}

export function useEligiblePlotsForContract() {
  return useQuery({ queryKey: contractsQueryKeys.eligible, queryFn: contractsApi.listEligiblePlots })
}

export function useContractPrerequisites(seasonRegistrationId: EntityId | undefined) {
  return useQuery({
    queryKey: contractsQueryKeys.prerequisites(seasonRegistrationId),
    queryFn: () => contractsApi.getPrerequisites(seasonRegistrationId as EntityId),
    enabled: seasonRegistrationId !== undefined,
  })
}

export function useContracts() {
  return useQuery({ queryKey: contractsQueryKeys.all, queryFn: contractsApi.list })
}

export function useContract(id: EntityId | undefined) {
  return useQuery({
    queryKey: contractsQueryKeys.detail(id),
    queryFn: () => contractsApi.getById(id as EntityId),
    enabled: id !== undefined,
  })
}

export function useCreateContract() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateContractInput) => contractsApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contractsQueryKeys.all })
      // Was missing — the just-contracted registration stayed visible in
      // "eligible plots for contract" until a reload, and clicking it
      // again 409s (can_create_contract rejects a second contract) with
      // no explanation of why something "on the list" just failed.
      queryClient.invalidateQueries({ queryKey: contractsQueryKeys.eligible })
    },
  })
}
