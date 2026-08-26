import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { usersApi } from './index'
import type { CreateUserInput, SetUserStatusInput, SoftDeleteUserInput, UpdateUserPhasesInput } from './types'

const KEY = ['users'] as const

export function useUsers() {
  return useQuery({ queryKey: KEY, queryFn: usersApi.list })
}

export function useCreateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateUserInput) => usersApi.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}

export function useUpdateUserPhases() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateUserPhasesInput) => usersApi.updatePhases(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}

export function useSetUserStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: SetUserStatusInput) => usersApi.setStatus(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}

export function useSoftDeleteUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: SoftDeleteUserInput) => usersApi.softDelete(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}
