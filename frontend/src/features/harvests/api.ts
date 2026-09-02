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
 *
 * Reference data (plots, farmers) is fetched once in bulk and joined in
 * memory, and per-registration harvest lookups run in parallel. This is the
 * original version of this pattern — arrivalQc/api.ts and packaging/api.ts
 * both copied it verbatim as a serial for-loop (three awaited requests per
 * registration) and have since been fixed the same way this file now is.
 * Never go back to looping one awaited GET per row here.
 */
async function loadPlotsAndFarmers(): Promise<{ plots: Plot[]; farmers: Farmer[] }> {
  const [plots, farmers] = await Promise.all([
    httpClient.get<Plot[]>('/plots'),
    httpClient.get<Farmer[]>('/farmers'),
  ])
  return { plots, farmers }
}

function resolveContext(
  registration: SeasonRegistration,
  plots: Plot[],
  farmers: Farmer[],
): { plot: Plot; farmer: Farmer } | null {
  const plot = plots.find((p) => p.id === registration.plotId)
  if (!plot) {
    console.warn(`[harvests] registration ${registration.id}: plot ${registration.plotId} not found in /plots — skipping`)
    return null
  }
  const farmer = farmers.find((f) => f.id === plot.farmerId)
  if (!farmer) {
    console.warn(`[harvests] registration ${registration.id}: farmer ${plot.farmerId} not found in /farmers — skipping`)
    return null
  }
  return { plot, farmer }
}

async function loadAllHarvests() {
  const [registrations, { plots, farmers }] = await Promise.all([
    httpClient.get<SeasonRegistration[]>('/registrations'),
    loadPlotsAndFarmers(),
  ])

  const perRegistration = await Promise.all(
    registrations.map(async (registration) => {
      const harvests = await httpClient.get<Harvest[]>(`/registrations/${registration.id}/harvests`)
      if (harvests.length === 0) return []
      const context = resolveContext(registration, plots, farmers)
      if (!context) return []
      return harvests.map((harvest) => ({ harvest, registration, plot: context.plot, farmer: context.farmer }))
    }),
  )
  return perRegistration.flat()
}

export const harvestsApiReal = {
  async listEligiblePlots(): Promise<EligiblePlotForHarvest[]> {
    const [registrations, { plots, farmers }] = await Promise.all([
      httpClient.get<SeasonRegistration[]>('/registrations'),
      loadPlotsAndFarmers(),
    ])
    const eligible = registrations.filter((r) => r.status === 'Under Contract' || r.status === 'Harvested (partial)')
    return eligible
      .map((r): EligiblePlotForHarvest | null => {
        const context = resolveContext(r, plots, farmers)
        if (!context) return null
        return {
          seasonRegistrationId: r.id,
          farmerName: context.farmer.name,
          plotNumber: context.plot.plotNumber,
          seasonYear: r.seasonYear,
          // Registration-scoped, not plot.variety (legacy) — a plot can
          // carry more than one variety.
          variety: r.varietyName as GrapeVariety,
        }
      })
      .filter((row): row is EligiblePlotForHarvest => row !== null)
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
