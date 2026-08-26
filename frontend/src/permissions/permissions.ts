import type { Role } from '@/types/common'

/**
 * Every permission key a screen or nav item can be gated on.
 * `read` implies list/detail view access; `create` implies the ability to
 * reach create/edit forms. Backend remains authoritative for every gate —
 * this only controls what the frontend shows/routes to (CLAUDE.md §4.7).
 */
export type PermissionKey =
  | 'farmers:read'
  | 'farmers:create'
  | 'bankDetails:manage'
  | 'seasonRegistrations:read'
  | 'seasonRegistrations:create'
  | 'plots:read'
  | 'plots:create'
  | 'fieldQc:read'
  | 'fieldQc:create'
  | 'labSamples:read'
  | 'labSamples:create'
  | 'contracts:read'
  | 'contracts:create'
  | 'harvests:read'
  | 'harvests:create'
  | 'vehicleTrips:read'
  | 'vehicleTrips:create'
  | 'weighing:read'
  | 'weighing:create'
  | 'arrivalQc:read'
  | 'arrivalQc:create'
  | 'packaging:read'
  | 'packaging:create'
  | 'palletisation:read'
  | 'palletisation:create'
  | 'preCooling:read'
  | 'preCooling:create'
  | 'inventory:read'
  | 'inventory:manage'
  | 'bom:read'
  | 'bom:manage'
  | 'purchaseOrders:read'
  | 'purchaseOrders:create'
  | 'containerIndents:read'
  | 'containerLoading:read'
  | 'farmerInvoices:read'
  | 'exportDocuments:read'
  | 'finishedGoodsQc:read'
  | 'reports:read'
  | 'users:manage'
  | 'settings:manage'
  | 'dashboard:read'
  | 'activeFarms:read'
  | 'seasons:manage'
  | 'userActivity:read'
  | 'auditLog:read'

const ALL_READ_KEYS: PermissionKey[] = [
  'farmers:read',
  'bankDetails:manage',
  'seasonRegistrations:read',
  'plots:read',
  'fieldQc:read',
  'labSamples:read',
  'contracts:read',
  'harvests:read',
  'vehicleTrips:read',
  'weighing:read',
  'arrivalQc:read',
  'packaging:read',
  'palletisation:read',
  'preCooling:read',
  'inventory:read',
  'bom:read',
  'purchaseOrders:read',
  'containerIndents:read',
  'containerLoading:read',
  'farmerInvoices:read',
  'exportDocuments:read',
  'finishedGoodsQc:read',
  'reports:read',
]

/**
 * Role -> permission set, per CLAUDE.md §6 and PHASE_MAP.md §5 role×phase matrix.
 * This is the ONLY place role checks are decided. Components/pages must go
 * through `usePermission`/`useHasAnyPermission`, never `user.role === 'x'`.
 */
export const ROLE_PERMISSIONS: Record<Role, Set<PermissionKey>> = {
  admin: new Set<PermissionKey>([
    ...ALL_READ_KEYS,
    'farmers:create',
    'seasonRegistrations:create',
    'plots:create',
    'fieldQc:create',
    'labSamples:create',
    'contracts:create',
    'harvests:create',
    'vehicleTrips:create',
    'weighing:create',
    'arrivalQc:create',
    'packaging:create',
    'palletisation:create',
    'preCooling:create',
    'inventory:manage',
    'bom:manage',
    'purchaseOrders:create',
    'users:manage',
    'settings:manage',
    'dashboard:read',
    'activeFarms:read',
    'seasons:manage',
    'userActivity:read',
    'auditLog:read',
  ]),

  // TODO(Open Q9): Bank Details ownership assumed Field Worker (PHASE_MAP.md
  // §5 footnote 1) — not explicit in Business_Rules.md, confirm with CEO.
  field_worker: new Set<PermissionKey>([
    'farmers:read',
    'farmers:create',
    'bankDetails:manage',
    'seasonRegistrations:read',
    'seasonRegistrations:create',
    'plots:read',
    'plots:create',
    'fieldQc:read',
    'fieldQc:create',
    'harvests:read',
    'harvests:create',
    'vehicleTrips:read',
    'vehicleTrips:create',
    'weighing:read',
    'weighing:create',
    'arrivalQc:read',
    'arrivalQc:create',
    // read-only reference access elsewhere
    'labSamples:read',
    'contracts:read',
    'packaging:read',
  ]),

  lab_worker: new Set<PermissionKey>([
    'labSamples:read',
    'labSamples:create',
    // needs read access to plots to see which passed Field QC (R18)
    'plots:read',
    'fieldQc:read',
  ]),

  office_worker: new Set<PermissionKey>([
    ...ALL_READ_KEYS,
    'contracts:create',
    'packaging:create',
    // TODO(Open Q9): Palletisation/Pre-Cooling owner assumed Office Worker.
    'palletisation:create',
    'preCooling:create',
    'purchaseOrders:create',
  ]),

  stock_manager: new Set<PermissionKey>([
    'inventory:read',
    'inventory:manage',
    'bom:read',
    'bom:manage',
    'purchaseOrders:read',
    'purchaseOrders:create',
    'packaging:read',
  ]),

  // Added 2026-08-11 (CLAUDE.md §6/Business_Rules R56) — Palletisation only,
  // plus read access to packaging/harvest context needed to know what's
  // been packed and ready to palletise.
  packaging_supervisor: new Set<PermissionKey>([
    'palletisation:read',
    'palletisation:create',
    'packaging:read',
    'harvests:read',
    'seasonRegistrations:read',
  ]),
}

export function roleHasPermission(role: Role, key: PermissionKey): boolean {
  return ROLE_PERMISSIONS[role]?.has(key) ?? false
}

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin',
  field_worker: 'Field Worker',
  lab_worker: 'Lab Worker',
  office_worker: 'Office Worker',
  stock_manager: 'Stock/Inventory Manager',
  packaging_supervisor: 'Packaging Supervisor',
}
