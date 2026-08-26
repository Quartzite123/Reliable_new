import { ROLE_LABELS } from '@/permissions/permissions'
import type { AuditActor, AuditEvent, RecordAuditEventInput } from './types'

export const auditEventsStore: AuditEvent[] = []

let nextEventId = 1
function allocateEventId() {
  return `audit-${nextEventId++}`
}

/**
 * No real "current actor" registry exists on `httpClient` (it only tracks
 * the access token, not who holds it) — mock mode has no logged-in-user
 * lookup to call here, so this stands in for it until one exists.
 */
const MOCK_ACTOR: AuditActor = { id: '1', name: 'Mock Admin', roles: ['admin'] }

/**
 * Called from every mock API mutation that needs an audit trail (CLAUDE.md
 * §5.2).
 */
export function recordAuditEvent(input: RecordAuditEventInput) {
  const actor = input.actorOverride ?? MOCK_ACTOR
  const event: AuditEvent = {
    id: allocateEventId(),
    timestamp: new Date().toISOString(),
    userId: actor.id,
    userName: actor.name,
    role: actor.roles.map((role) => ROLE_LABELS[role]).join(', '),
    action: input.action,
    module: input.module,
    recordRef: input.recordRef,
    result: input.result,
    oldStatus: input.oldStatus,
    newStatus: input.newStatus,
  }
  auditEventsStore.unshift(event)
  return event
}
