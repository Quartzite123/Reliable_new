import { httpClient } from '@/api/httpClient'
import type { User } from '@/types/common'
import type { CreateUserInput, ResetLockoutInput, SetUserStatusInput, SoftDeleteUserInput, UpdateUserInput } from './types'

export const usersApiReal = {
  list: () => httpClient.get<User[]>('/users'),
  create: (input: CreateUserInput) => httpClient.post<User>('/users', input),
  update: ({ id, ...changes }: UpdateUserInput) => httpClient.patch<User>(`/users/${id}`, changes),
  setStatus: (input: SetUserStatusInput) => httpClient.patch<User>(`/users/${input.id}`, { active: input.active }),
  softDelete: (input: SoftDeleteUserInput) => httpClient.delete<User>(`/users/${input.id}`),
  resetLockout: (input: ResetLockoutInput) => httpClient.patch<User>(`/users/${input.id}`, { resetLockout: true }),
}
