import type { EntityId, PhaseKey, Role, User } from '@/types/common'

export interface CreateUserInput {
  name: string
  mobile: string
  email: string
  role: Role
  phases: PhaseKey[]
  temporaryPassword: string
}

/**
 * Full edit — every field optional so the caller only sends what changed.
 * `password` omitted (not empty string) means "leave unchanged"; the page
 * is responsible for turning a blank form field into `undefined` before
 * calling this, never sending `''` to the API.
 */
export interface UpdateUserInput {
  id: EntityId
  name?: string
  mobile?: string
  email?: string
  password?: string
  phases?: PhaseKey[]
}

export interface SetUserStatusInput {
  id: EntityId
  active: boolean
}

export interface SoftDeleteUserInput {
  id: EntityId
}

export interface ResetLockoutInput {
  id: EntityId
}

export type { User }
