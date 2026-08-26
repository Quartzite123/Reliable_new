import { httpClient } from '@/api/httpClient'
import type { EntityId } from '@/types/common'
import type { Farmer } from '@/features/farmers'
import type { GrapeVariety, Plot, SeasonRegistration } from '@/features/plots'
import type {
  CreateHarvestInput,
  EligiblePlotForHarvest,
  Harvest,
  HarvestDetail,
  HarvestRow,
  VehicleTripRow,
} from './types'

/**
 * No global `GET /harvests`, `GET /harvests/{id}`, or `GET /vehicle-trips`
 * exist on the real backend (verified via openapi.json — the only harvest
 * routes are `POST/GET /registrations/{reg_id}/harvests`). Everything below
 * is composed client-side by walking `/registrations` and fetching each
 * registration's harvests.
 */
async function loadContext(seasonRegistrationId: EntityId) {
  const registration = await httpClient.get<SeasonRegistration>(`/registrations/${seasonRegistrationId}`)
  const plot = await httpClient.get<Plot>(`/plots/${registration.plotId}`)
  const farmer = await httpClient.get<Farmer>(`/farmers/${plot.farmerId}`)
  return { registration, plot, farmer }
}

async function loadAllHarvests() {
  const registrations = await httpClient.get<SeasonRegistration[]>('/registrations')
  const results: { harvest: Harvest; registration: SeasonRegistration; plot: Plot; farmer: Farmer }[] = []
  for (const registration of registrations) {
    const harvests = await httpClient.get<Harvest[]>(`/registrations/${registration.id}/harvests`)
    if (harvests.length === 0) continue
    const plot = await httpClient.get<Plot>(`/plots/${registration.plotId}`)
    const farmer = await httpClient.get<Farmer>(`/farmers/${plot.farmerId}`)
    for (const harvest of harvests) {
      results.push({ harvest, registration, plot, farmer })
    }
  }
  return results
}

export const harvestsApiReal = {
  async listEligiblePlots(): Promise<EligiblePlotForHarvest[]> {
    const registrations = await httpClient.get<SeasonRegistration[]>('/registrations')
    const eligible = registrations.filter((r) => r.status === 'Under Contract' || r.status === 'Harvested (partial)')
    const rows: EligiblePlotForHarvest[] = []
    for (const r of eligible) {
      const { plot, farmer } = await loadContext(r.id)
      rows.push({
        seasonRegistrationId: r.id,
        farmerName: farmer.name,
        plotNumber: plot.plotNumber,
        seasonYear: r.seasonYear,
        variety: plot.variety as GrapeVariety,
      })
    }
    return rows
  },

  async list(): Promise<HarvestRow[]> {
    const all = await loadAllHarvests()
    return all.map(({ harvest, registration, plot, farmer }) => ({
      harvest,
      farmerName: farmer.name,
      plotNumber: plot.plotNumber,
      seasonYear: registration.seasonYear,
      tripCount: harvest.vehicleTrips.length,
    }))
  },

  async getById(id: EntityId): Promise<HarvestDetail> {
    const all = await loadAllHarvests()
    const found = all.find((row) => row.harvest.id === id)
    if (!found) throw new Error('Harvest not found.')
    const { harvest, registration, plot, farmer } = found
    return {
      harvest,
      farmerName: farmer.name,
      plotNumber: plot.plotNumber,
      seasonYear: registration.seasonYear,
      seasonRegistrationId: registration.id,
      trips: harvest.vehicleTrips,
    }
  },

  async listVehicleTrips(): Promise<VehicleTripRow[]> {
    const all = await loadAllHarvests()
    const rows: VehicleTripRow[] = []
    for (const { harvest, plot, farmer } of all) {
      for (const trip of harvest.vehicleTrips) {
        rows.push({
          trip,
          harvestDate: harvest.harvestDate,
          farmerName: farmer.name,
          plotNumber: plot.plotNumber,
          weighed: trip.isWeighed,
        })
      }
    }
    return rows
  },

  create: (input: CreateHarvestInput) =>
    httpClient.post<Harvest>(`/registrations/${input.seasonRegistrationId}/harvests`, {
      harvestDate: input.harvestDate,
      supervisorName: input.supervisorName,
      supervisorContact: input.supervisorContact,
      vehicleTrips: input.trips.map((t) => ({
        vehicleNo: t.vehicleNo,
        driverName: t.driverName,
        numCrates: t.numCrates,
        approxWeightKg: t.approxWeightKg,
      })),
    }),
}
