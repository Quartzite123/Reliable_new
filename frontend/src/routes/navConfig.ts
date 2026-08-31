import type { ComponentType, SVGProps } from 'react'
import type { PermissionKey } from '@/permissions/permissions'
import type { PhaseKey } from '@/types/common'
import {
  BellIcon,
  BoxesIcon,
  CalendarIcon,
  ChartIcon,
  ContractIcon,
  DocumentIcon,
  FarmersIcon,
  FlaskIcon,
  HelpIcon,
  HomeIcon,
  LayersIcon,
  MapPinIcon,
  PackageIcon,
  RecordsIcon,
  ScaleIcon,
  SearchCheckIcon,
  SettingsIcon,
  SnowflakeIcon,
  TasksIcon,
  TruckIcon,
  UsersCogIcon,
} from '@/components/icons/Icon'

export interface NavItem {
  label: string
  href: string
  /**
   * Legacy role-permission gate — no longer consulted by `useVisibleNav`
   * (added 2026-08-11: phase-based access replaced it). Left in place because
   * route guards in routeConfig.tsx are still permission-based; kept here so
   * the association between a nav entry and its route guard stays visible.
   */
  permission?: PermissionKey
  /** Item is shown only if the current user has this phase assigned. Omit for always-visible items (Home, Help, etc.). */
  phaseKey?: PhaseKey
  /** Purely decorative — never affects the item's accessible name. */
  icon?: ComponentType<SVGProps<SVGSVGElement>>
  /** Renders as a group header (own permission optional) with an indented sub-list — e.g. Inventory (added 2026-08-11). */
  children?: NavItem[]
}

/**
 * Single source of nav structure — Sidebar and MobileNav both read this and
 * filter by `usePermission`, so no component hardcodes which role sees what
 * (prompt.md §6/§21).
 */
export const PRIMARY_NAV: NavItem[] = [
  { label: 'Home', href: '/home', icon: HomeIcon },
  { label: 'My Tasks', href: '/tasks', icon: TasksIcon },
  { label: 'My Records', href: '/records', icon: RecordsIcon },
  { label: 'Notifications', href: '/notifications', icon: BellIcon },
  { label: 'Help', href: '/help', icon: HelpIcon },
]

export const SUPERVISOR_NAV: NavItem[] = [
  { label: 'Farmers', href: '/farmers', permission: 'farmers:read', phaseKey: 'farmer_registration', icon: FarmersIcon },
  // Season Registrations isn't its own phase — it's part of the combined Plot Registration screen (CLAUDE.md Phase 2).
  { label: 'Season Registrations', href: '/season-registrations', permission: 'seasonRegistrations:read', phaseKey: 'plot_registration', icon: CalendarIcon },
  { label: 'Plots', href: '/plots', permission: 'plots:read', phaseKey: 'plot_registration', icon: MapPinIcon },
  // Field QC is recorded on the Plot registration screen, not a standalone
  // page — the /field-qc route just points workers back to Plots, which
  // looks unfinished as its own nav entry. Route/page left in place; restore
  // this line if a standalone Field QC page is ever built.
  // { label: 'Field QC', href: '/field-qc', permission: 'fieldQc:read', phaseKey: 'field_qc', icon: SearchCheckIcon },
  { label: 'Lab Sampling', href: '/lab-samples', permission: 'labSamples:read', phaseKey: 'lab_sampling', icon: FlaskIcon },
  { label: 'Contracts', href: '/contracts', permission: 'contracts:read', phaseKey: 'farmer_contract', icon: ContractIcon },
  { label: 'Harvests', href: '/harvests', permission: 'harvests:read', phaseKey: 'harvesting', icon: TruckIcon },
  // Vehicle Trips isn't its own phase — trips are recorded as part of Harvesting (CLAUDE.md Phase 5).
  { label: 'Vehicle Trips', href: '/vehicle-trips', permission: 'vehicleTrips:read', phaseKey: 'harvesting', icon: TruckIcon },
  { label: 'Weighing', href: '/weighing', permission: 'weighing:read', phaseKey: 'weighing', icon: ScaleIcon },
  { label: 'Arrival QC', href: '/arrival-qc', permission: 'arrivalQc:read', phaseKey: 'arrival_qc', icon: SearchCheckIcon },
  { label: 'Packaging', href: '/packaging', permission: 'packaging:read', phaseKey: 'packaging', icon: PackageIcon },
  { label: 'Palletisation', href: '/palletisation', permission: 'palletisation:read', phaseKey: 'palletisation', icon: LayersIcon },
  { label: 'Pre-Cooling', href: '/pre-cooling', permission: 'preCooling:read', phaseKey: 'pre_cooling', icon: SnowflakeIcon },
  {
    label: 'Inventory',
    href: '/inventory',
    permission: 'inventory:read',
    phaseKey: 'inventory_management',
    icon: BoxesIcon,
    children: [
      { label: 'Dashboard', href: '/inventory', permission: 'inventory:read', phaseKey: 'inventory_management' },
      { label: 'Materials', href: '/inventory/materials', permission: 'inventory:read', phaseKey: 'inventory_management' },
      { label: 'Product Combinations', href: '/inventory/products', permission: 'inventory:read', phaseKey: 'inventory_management' },
      { label: 'BOM', href: '/inventory/bom', permission: 'bom:read', phaseKey: 'inventory_management' },
      { label: 'Stock In', href: '/inventory/stock-in', permission: 'inventory:manage', phaseKey: 'inventory_management' },
      { label: 'Adjustments', href: '/inventory/adjustments', permission: 'inventory:manage', phaseKey: 'inventory_management' },
      { label: 'Order Calculator', href: '/inventory/order-calculator', permission: 'inventory:read', phaseKey: 'inventory_management' },
      { label: 'Movement Log', href: '/inventory/movements', permission: 'inventory:read', phaseKey: 'inventory_management' },
      { label: 'Alerts', href: '/inventory/alerts', permission: 'inventory:read', phaseKey: 'inventory_management' },
    ],
  },
  // Neither Documents nor Reports maps to one of the 14 phases (both are future/unscoped modules,
  // CLAUDE.md §13) — no phaseKey means always-visible under the new phase-based nav filter. Their
  // routes are still gated by the pre-existing permission system in routeConfig.tsx (unchanged).
  { label: 'Documents', href: '/export-documents', permission: 'exportDocuments:read', icon: DocumentIcon },
  { label: 'Reports', href: '/reports', permission: 'reports:read', icon: ChartIcon },
]

export const ADMIN_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/admin/dashboard', permission: 'dashboard:read', phaseKey: 'admin', icon: HomeIcon },
  { label: 'Active Farms', href: '/admin/active-farms', permission: 'activeFarms:read', phaseKey: 'admin', icon: FarmersIcon },
  { label: 'Users', href: '/admin/users', permission: 'users:manage', phaseKey: 'admin', icon: UsersCogIcon },
  { label: 'Seasons', href: '/admin/seasons', permission: 'seasons:manage', phaseKey: 'admin', icon: CalendarIcon },
  { label: 'User Activity', href: '/admin/user-activity', permission: 'userActivity:read', phaseKey: 'admin', icon: RecordsIcon },
  { label: 'Audit Trail', href: '/admin/audit-trail', permission: 'auditLog:read', phaseKey: 'admin', icon: ChartIcon },
  { label: 'Settings', href: '/admin/settings', permission: 'settings:manage', phaseKey: 'admin', icon: SettingsIcon },
]
