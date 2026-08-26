import { httpClient } from '@/api/httpClient'
import type { User } from '@/types/common'
import type { CreateUserInput, SetUserStatusInput, SoftDeleteUserInput, UpdateUserPhasesInput } from './types'

export const usersApiReal = {
  list: () => httpClient.get<User[]>('/users'),
  create: (input: CreateUserInput) => httpClient.post<User>('/users', input),
  updatePhases: (input: UpdateUserPhasesInput) => httpClient.patch<User>(`/users/${input.id}`, { phases: input.phases }),
  setStatus: (input: SetUserStatusInput) => httpClient.patch<User>(`/users/${input.id}`, { active: input.active }),
  softDelete: (input: SoftDeleteUserInput) => httpClient.delete<User>(`/users/${input.id}`),
}
