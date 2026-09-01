import { ApiError } from '@/api/httpClient'
import { mockDelay } from '@/api/mockDelay'
import { recordAuditEvent } from '@/features/auditLog'
import type { EntityId, User } from '@/types/common'
import { allocateUserId, usersStore } from './mockStore'
import type { CreateUserInput, ResetLockoutInput, SetUserStatusInput, SoftDeleteUserInput, UpdateUserInput } from './types'

/**
 * The mock store does not replicate app/services/user_admin_guard.py's
 * rules (self-phase-edit block, admin-target protection, users-phase
 * grant block, admin-phase immutability) — those are the real security
 * boundary and are backend-only by design (2026-09-01: "Enforce all of
 * these on the BACKEND, not just by hiding UI"). This mock is for
 * offline UI development, not a second copy of the boundary to keep in
 * sync.
 */

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
      mobile: input.mobile,
      email: input.email,
      role: input.role,
      active: true,
      phases: input.phases,
      failedLoginCount: 0,
      password: input.temporaryPassword,
    }
    usersStore.push(user)
    recordAuditEvent({ action: 'User created', module: 'Users', result: 'success', recordRef: user.email })
    return toPublicUser(user)
  },

  /** Full edit — name/mobile/email/phases always sent; password only when the admin typed a new one. */
  async update({ id, ...changes }: UpdateUserInput): Promise<User> {
    await mockDelay(300)
    const user = findUserOrThrow(id)
    if (changes.name !== undefined) user.name = changes.name
    if (changes.mobile !== undefined) user.mobile = changes.mobile
    if (changes.email !== undefined) user.email = changes.email
    if (changes.phases !== undefined) user.phases = changes.phases
    if (changes.password !== undefined) {
      user.password = changes.password
      recordAuditEvent({ action: 'Password reset', module: 'Users', result: 'success', recordRef: user.email })
    }
    if (changes.phases !== undefined) {
      recordAuditEvent({ action: 'User phases changed', module: 'Users', result: 'success', recordRef: user.email })
    }
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
   * "Delete" only ever deactivated (CLAUDE.md §12 — no hard deletes);
   * mechanically identical to setStatus(false). Kept as a separate method
   * because it's a separate user-facing action (2026-09-01: renamed
   * Delete -> Deactivate in the UI, but kept as its own affordance
   * alongside the status toggle rather than merged into it).
   */
  async softDelete(input: SoftDeleteUserInput): Promise<User> {
    await mockDelay(300)
    const user = findUserOrThrow(input.id)
    const oldStatus = user.active ? 'active' : 'inactive'
    user.active = false
    recordAuditEvent({
      action: 'User deactivated',
      module: 'Users',
      result: 'success',
      recordRef: user.email,
      oldStatus,
      newStatus: 'inactive',
    })
    return toPublicUser(user)
  },

  /** No lockout simulation in the mock store — every mock user starts unlocked, so this is a no-op that just returns the user. */
  async resetLockout(input: ResetLockoutInput): Promise<User> {
    await mockDelay(300)
    const user = findUserOrThrow(input.id)
    recordAuditEvent({ action: 'Login lockout cleared', module: 'Users', result: 'success', recordRef: user.email })
    return toPublicUser(user)
  },
}
