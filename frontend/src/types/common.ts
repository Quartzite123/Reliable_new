/** Roles per CLAUDE.md §6 / Business_Rules R52. Fixed set — do not add roles ad hoc. Display label only — screen access is phase-based (`User.phases`), not role-based. */
export type Role =
  | 'admin'
  | 'field_worker'
  | 'lab_worker'
  | 'office_worker'
  | 'stock_manager'
  | 'packaging_supervisor'

/**
 * The 14 phases a user can be individually assigned to. Admin grants any
 * combination directly to a user — access is no longer inferred from role.
 */
export type PhaseKey =
  | 'farmer_registration'
  | 'plot_registration'
  | 'field_qc'
  | 'lab_sampling'
  | 'farmer_contract'
  | 'harvesting'
  | 'weighing'
  | 'arrival_qc'
  | 'packaging'
  | 'inventory_management'
  | 'palletisation'
  | 'pre_cooling'
  | 'finished_goods_qc'
  | 'admin'
  /** Added 2026-09-01 — user management, split out of 'admin'. See app/services/user_admin_guard.py on the backend for the actual security boundary (this phase alone isn't the whole story). */
  | 'users'
  /** Added 2026-09-01 — placeholder, same pattern as 'finished_goods_qc'. Gates the not-yet-built Reports and Export Documents modules; gates nothing today. */
  | 'reports_documents'

/**
 * Generic lifecycle status used across QC, contracts, harvest, etc.
 * Never remove a status by deleting the record — flip the status instead
 * (CLAUDE.md §12, Business_Rules R8/R16).
 */
export type RecordStatus =
  | 'not_started'
  | 'in_progress'
  | 'submitted'
  | 'passed'
  | 'failed'
  | 'approved'
  | 'rejected'
  | 'completed'
  | 'blocked'

export interface User {
  id: EntityId
  /** Nullable on the backend (UserRead.name) — some accounts may not have one set. */
  name?: string
  /** Nullable on the backend (existing accounts predate this field) — required going forward for new accounts (2026-09-01). Not unique — matches Farmer.mobile. */
  mobile?: string
  email: string
  role: Role
  active: boolean
  /** Screens this user can see — the actual access-control mechanism. `role` above is a display label only. */
  phases: PhaseKey[]
  lastLoginAt?: string
  /** Optional so mock data (features/users/mockStore.ts) doesn't need updating for every seed row — treat missing as 0. */
  failedLoginCount?: number
  /** Non-null and in the future = currently locked out (login lockout fix, 2026-09-01). */
  lockedUntil?: string
}

/** Opaque internal database id — backend ids are integers (verified via openapi.json: every *Read schema's `id` is `integer`). */
export type EntityId = number

export interface Timestamped {
  createdAt: string
  updatedAt: string
}

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface ApiErrorShape {
  message: string
  code?: string
  fieldErrors?: Record<string, string>
}
