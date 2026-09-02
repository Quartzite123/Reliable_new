import type { EntityId } from '@/types/common'
import type { SeasonRegistration } from '@/features/plots'

/** Denormalized read row joining the plot+season record back to its farmer and plot for display. */
export interface SeasonRegistrationRow {
  registration: SeasonRegistration
  plotNumber: string
  mhRegistrationNumber?: string
  farmerId: EntityId
  farmerName: string
}

/** registration.varietyName carries the variety already — no separate field needed here. */
