import { ApiError } from '@/api/httpClient'
import { mockDelay } from '@/api/mockDelay'
import { recordAuditEvent } from '@/features/auditLog'
import type { EntityId, User } from '@/types/common'
import { allocateUserId, usersStore } from './mockStore'
import type { CreateUserInput, SetUserStatusInput, SoftDeleteUserInput, UpdateUserPhasesInput } from './types'

function toPublicUser({ password: _password, ...user }: (typeof usersStore)[number]): User {
  return user
}

function findUserOrThrow(id: EntityId) {
  const user = usersStore.find((u) => u.id === id)
  if (!user) throw new ApiError(404, { message: 'User not found.' })
  return user
}

export const usersApiMock = {
  async list(): Promise<User[]> {
    await mockDelay()
    return usersStore.map(toPublicUser)
  },

  /** Admin-created accounts only — no self-signup (CLAUDE.md §6). */
  async create(input: CreateUserInput): Promise<User> {
    await mockDelay(400)
    if (usersStore.some((u) => u.email.toLowerCase() === input.email.toLowerCase())) {
      throw new ApiError(409, {
        message: 'A user with this email already exists.',
        fieldErrors: { email: 'This email is already registered.' },
      })
    }
    const user = {
      id: allocateUserId(),
      name: input.name,
      email: input.email,
      role: input.role,
      active: true,
      phases: input.phases,
      password: input.temporaryPassword,
    }
    usersStore.push(user)
    recordAuditEvent({ action: 'User created', module: 'Users', result: 'success', recordRef: user.email })
    return toPublicUser(user)
  },

  async updatePhases(input: UpdateUserPhasesInput): Promise<User> {
    await mockDelay(300)
    const user = findUserOrThrow(input.id)
    user.phases = input.phases
    recordAuditEvent({ action: 'User phases changed', module: 'Users', result: 'success', recordRef: user.email })
    return toPublicUser(user)
  },

  /** Soft status change only — never removes the account (CLAUDE.md §12). */
  async setStatus(input: SetUserStatusInput): Promise<User> {
    await mockDelay(300)
    const user = findUserOrThrow(input.id)
    const oldStatus = user.active ? 'active' : 'inactive'
    user.active = input.active
    recordAuditEvent({
      action: 'User status changed',
      module: 'Users',
      result: 'success',
      recordRef: user.email,
      oldStatus,
      newStatus: user.active ? 'active' : 'inactive',
    })
    return toPublicUser(user)
  },

  /**
   * Marks the user deleted without ever removing the record (CLAUDE.md
   * §12 — no hard deletes). Our `User` type has no separate "deleted" state
   * distinct from `active: boolean`, so a soft delete is mechanically the
   * same as deactivating; the audit log is what preserves "this was a
   * delete" as a distinct fact from "this was a deactivation."
   */
  async softDelete(input: SoftDeleteUserInput): Promise<User> {
    await mockDelay(300)
    const user = findUserOrThrow(input.id)
    const oldStatus = user.active ? 'active' : 'inactive'
    user.active = false
    recordAuditEvent({
      action: 'User deleted',
      module: 'Users',
      result: 'success',
      recordRef: user.email,
      oldStatus,
      newStatus: 'deleted',
    })
    return toPublicUser(user)
  },
}
