import type { EntityId } from '@/types/common'

/**
 * Replaces the plain-string customer name used elsewhere in the source Excel
 * (PHASE_MAP.md §7/§9) — packaging and item-master screens always reference
 * `customerId`, never a raw customer name string, in business logic.
 */
export interface Customer {
  id: EntityId
  name: string
  code?: string
  isActive: boolean
}
