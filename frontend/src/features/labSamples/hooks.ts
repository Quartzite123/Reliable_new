import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { EntityId } from '@/types/common'
import { labSamplesApi } from './index'
import type { CreateLabSampleInput } from './types'

export const labSamplesQueryKeys = {
  eligible: ['lab-samples', 'eligible'] as const,
  all: ['lab-samples'] as const,
  detail: (id: EntityId | undefined) => ['lab-samples', id ?? 'unknown'] as const,
  reference: (seasonRegistrationId: EntityId | undefined) => ['lab-samples', 'reference', seasonRegistrationId ?? 'unknown'] as const,
}

export function useEligiblePlotsForLab() {
  return useQuery({ queryKey: labSamplesQueryKeys.eligible, queryFn: labSamplesApi.listEligiblePlots })
}

export function useLabSamples() {
  return useQuery({ queryKey: labSamplesQueryKeys.all, queryFn: labSamplesApi.list })
}

export function useLabSample(id: EntityId | undefined) {
  return useQuery({
    queryKey: labSamplesQueryKeys.detail(id),
    queryFn: () => labSamplesApi.getById(id as EntityId),
    enabled: id !== undefined,
  })
}

export function useLabSampleReference(seasonRegistrationId: EntityId | undefined) {
  return useQuery({
    queryKey: labSamplesQueryKeys.reference(seasonRegistrationId),
    queryFn: () => labSamplesApi.getReference(seasonRegistrationId as EntityId),
    enabled: seasonRegistrationId !== undefined,
  })
}

export function useCreateLabSample() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateLabSampleInput) => labSamplesApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: labSamplesQueryKeys.eligible })
      queryClient.invalidateQueries({ queryKey: labSamplesQueryKeys.all })
    },
  })
}
