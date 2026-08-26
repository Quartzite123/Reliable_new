import { httpClient } from '@/api/httpClient'
import type { Farmer } from '@/features/farmers'
import type { Plot, SeasonRegistration } from '@/features/plots'
import type { SeasonRegistrationRow } from './types'

/**
 * There is no `/season-registrations` endpoint on the real backend — the
 * route is `/registrations`, and it returns the bare join table rows with
 * no farmer/plot info attached (verified via openapi.json: SeasonRegistrationRead
 * has only id/plot_id/season_year/status/registered_by/registered_at). This
 * denormalizes client-side the same way plots/api.ts does for plot detail.
 */
export const seasonRegistrationsApiReal = {
  async list(): Promise<SeasonRegistrationRow[]> {
    const [registrations, plots, farmers] = await Promise.all([
      httpClient.get<SeasonRegistration[]>('/registrations'),
      httpClient.get<Plot[]>('/plots'),
      httpClient.get<Farmer[]>('/farmers'),
    ])

    return registrations
      .map((registration): SeasonRegistrationRow | null => {
        const plot = plots.find((p) => p.id === registration.plotId)
        if (!plot) return null
        const farmer = farmers.find((f) => f.id === plot.farmerId)
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
