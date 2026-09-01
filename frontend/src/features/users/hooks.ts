import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { usersApi } from './index'
import type { CreateUserInput, ResetLockoutInput, SetUserStatusInput, SoftDeleteUserInput, UpdateUserInput } from './types'

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

export function useUpdateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateUserInput) => usersApi.update(input),
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

export function useResetLockout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ResetLockoutInput) => usersApi.resetLockout(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}
