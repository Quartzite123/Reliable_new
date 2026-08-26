interface ActivityBookkeeping {
  lastLoginAt: string | null
  lastLogoutAt: string | null
  lastActivityAt: string | null
  failedLoginCount: number
  lastFailedLoginAt: string | null
}

/** Keyed by user id — updated by features/auth/api.mock.ts on every login/logout attempt. */
export const activityStore = new Map<string, ActivityBookkeeping>()

function entryFor(userId: string): ActivityBookkeeping {
  let entry = activityStore.get(userId)
  if (!entry) {
    entry = { lastLoginAt: null, lastLogoutAt: null, lastActivityAt: null, failedLoginCount: 0, lastFailedLoginAt: null }
    activityStore.set(userId, entry)
  }
  return entry
}

export function recordLoginSuccess(userId: string) {
  const entry = entryFor(userId)
  const now = new Date().toISOString()
  entry.lastLoginAt = now
  entry.lastActivityAt = now
}

export function recordLoginFailure(userId: string) {
  const entry = entryFor(userId)
  entry.failedLoginCount += 1
  entry.lastFailedLoginAt = new Date().toISOString()
}

export function recordLogout(userId: string) {
  const entry = entryFor(userId)
  entry.lastLogoutAt = new Date().toISOString()
}
