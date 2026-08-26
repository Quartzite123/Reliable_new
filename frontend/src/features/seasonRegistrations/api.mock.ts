import { mockDelay } from '@/api/mockDelay'
import { farmersStore } from '@/features/farmers/mockStore'
import { plotsStore, seasonRegistrationsStore } from '@/features/plots/mockStore'
import type { SeasonRegistrationRow } from './types'

/**
 * Read-only view over the plot+season join (CLAUDE.md §12: "Never build a
 * Season Management module — season is just a year tag on registrations").
 * Creation happens through the combined Plot + Field QC screen, not here.
 */
export const seasonRegistrationsApiMock = {
  async list(): Promise<SeasonRegistrationRow[]> {
    await mockDelay()
    return seasonRegistrationsStore
      .map((registration): SeasonRegistrationRow | null => {
        const plot = plotsStore.find((p) => p.id === registration.plotId)
        if (!plot) return null
        const farmer = farmersStore.find((f) => f.id === plot.farmerId)
        if (!farmer) return null
        return {
          registration,
          plotNumber: plot.plotNumber,
          mhRegistrationNumber: plot.mhRegistrationNumber,
          farmerId: farmer.id,
          farmerName: farmer.name,
        }
      })
      .filter((row): row is SeasonRegistrationRow => row !== null)
      .sort((a, b) => b.registration.seasonYear - a.registration.seasonYear)
  },
}
