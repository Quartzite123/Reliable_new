import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { seasonsApi } from './index'
import type { CreateSeasonInput, UpdateSeasonInput } from './types'

const KEY = ['seasons'] as const
const CURRENT_KEY = ['seasons', 'current'] as const

export function useSeasons() {
  return useQuery({ queryKey: KEY, queryFn: seasonsApi.list })
}

export function useCurrentSeason() {
  return useQuery({ queryKey: CURRENT_KEY, queryFn: seasonsApi.getCurrent })
}

export function useCreateSeason() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateSeasonInput) => seasonsApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEY })
      queryClient.invalidateQueries({ queryKey: CURRENT_KEY })
    },
  })
}

export function useUpdateSeason() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateSeasonInput) => seasonsApi.update(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEY })
      queryClient.invalidateQueries({ queryKey: CURRENT_KEY })
    },
  })
}
