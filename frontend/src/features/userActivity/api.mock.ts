import { mockDelay } from '@/api/mockDelay'
import { usersStore } from '@/features/users/mockStore'
import { activityStore } from './mockStore'
import type { UserActivityRow } from './types'

export const userActivityApiMock = {
  async list(): Promise<UserActivityRow[]> {
    await mockDelay()
    return usersStore.map((user) => {
      // activityStore is keyed by string (never wired to a numeric EntityId call site elsewhere) — coerce here rather than at the store.
      const activity = activityStore.get(String(user.id))
      return {
        userId: user.id,
        name: user.name ?? '',
        email: user.email,
        roles: [user.role],
        active: user.active,
        lastLoginAt: activity?.lastLoginAt ?? null,
        lastLogoutAt: activity?.lastLogoutAt ?? null,
        lastActivityAt: activity?.lastActivityAt ?? null,
        failedLoginCount: activity?.failedLoginCount ?? 0,
        lastFailedLoginAt: activity?.lastFailedLoginAt ?? null,
      }
    })
  },
}
