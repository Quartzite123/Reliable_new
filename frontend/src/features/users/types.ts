import type { EntityId, PhaseKey, Role, User } from '@/types/common'

export interface CreateUserInput {
  name: string
  email: string
  role: Role
  phases: PhaseKey[]
  temporaryPassword: string
}

export interface UpdateUserPhasesInput {
  id: EntityId
  phases: PhaseKey[]
}

export interface SetUserStatusInput {
  id: EntityId
  active: boolean
}

export interface SoftDeleteUserInput {
  id: EntityId
}

export type { User }
