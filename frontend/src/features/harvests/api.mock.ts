import { ApiError } from '@/api/httpClient'
import { mockDelay } from '@/api/mockDelay'
import type { EntityId } from '@/types/common'
import { farmersStore } from '@/features/farmers/mockStore'
import { plotsStore, seasonRegistrationsStore } from '@/features/plots/mockStore'
import {
  allocateHarvestId,
  allocateVehicleTripId,
  harvestsStore,
  vehicleTripsStore,
} from './mockStore'
import type {
  CreateHarvestInput,
  EligiblePlotForHarvest,
  Harvest,
  HarvestDetail,
  HarvestRow,
  VehicleTripRow,
} from './types'

function resolveContext(seasonRegistrationId: EntityId) {
  const registration = seasonRegistrationsStore.find((r) => r.id === seasonRegistrationId)
  if (!registration) return null
  const plot = plotsStore.find((p) => p.id === registration.plotId)
  if (!plot) return null
  const farmer = farmersStore.find((f) => f.id === plot.farmerId)
  if (!farmer) return null
  return { registration, plot, farmer }
}

export const harvestsApiMock = {
  /** Registrations under contract (or already partially harvested — multiple rounds are allowed, R26). */
  async listEligiblePlots(): Promise<EligiblePlotForHarvest[]> {
    await mockDelay()
    return seasonRegistrationsStore
      .filter((r) => r.status === 'Under Contract' || r.status === 'Harvested (partial)')
      .map((r) => {
        const context = resolveContext(r.id)
        return context
          ? {
              seasonRegistrationId: r.id,
              farmerName: context.farmer.name,
              plotNumber: context.plot.plotNumber,
              seasonYear: r.seasonYear,
              variety: context.plot.variety!,
            }
          : null
      })
      .filter((row): row is EligiblePlotForHarvest => row !== null)
  },

  async list(): Promise<HarvestRow[]> {
    await mockDelay()
    return harvestsStore
      .map((harvest) => {
        const context = resolveContext(harvest.seasonRegistrationId)
        if (!context) return null
        return {
          harvest,
          farmerName: context.farmer.name,
          plotNumber: context.plot.plotNumber,
          seasonYear: context.registration.seasonYear,
          tripCount: vehicleTripsStore.filter((t) => t.harvestId === harvest.id).length,
        }
      })
      .filter((row): row is HarvestRow => row !== null)
  },

  async getById(id: EntityId): Promise<HarvestDetail> {
    await mockDelay()
    const harvest = harvestsStore.find((h) => h.id === id)
    if (!harvest) throw new ApiError(404, { message: 'Harvest not found.' })
    const context = resolveContext(harvest.seasonRegistrationId)
    if (!context) throw new ApiError(404, { message: 'Related plot/farmer record not found.' })

    return {
      harvest,
      farmerName: context.farmer.name,
      plotNumber: context.plot.plotNumber,
      seasonYear: context.registration.seasonYear,
      seasonRegistrationId: context.registration.id,
      trips: vehicleTripsStore.filter((t) => t.harvestId === harvest.id),
    }
  },

  async listVehicleTrips(): Promise<VehicleTripRow[]> {
    await mockDelay()
    return vehicleTripsStore
      .map((trip) => {
        const harvest = harvestsStore.find((h) => h.id === trip.harvestId)
        if (!harvest) return null
        const context = resolveContext(harvest.seasonRegistrationId)
        if (!context) return null
        return {
          trip,
          harvestDate: harvest.harvestDate,
          farmerName: context.farmer.name,
          plotNumber: context.plot.plotNumber,
          weighed: trip.isWeighed,
        }
      })
      .filter((row): row is VehicleTripRow => row !== null)
  },

  /** Harvest + one or more vehicle trips saved together (prompt.md §13). */
  async create(input: CreateHarvestInput): Promise<Harvest> {
    await mockDelay(500)

    const context = resolveContext(input.seasonRegistrationId)
    if (!context) throw new ApiError(404, { message: 'Season registration not found.' })
    if (context.registration.status !== 'Under Contract' && context.registration.status !== 'Harvested (partial)') {
      throw new ApiError(409, { message: 'This record cannot continue until the Contract is in place.' })
    }

    const harvestId = allocateHarvestId()
    const trips = input.trips.map((trip) => ({
      id: allocateVehicleTripId(),
      harvestId,
      vehicleNo: trip.vehicleNo,
      driverName: trip.driverName,
      numCrates: trip.numCrates,
      approxWeightKg: String(trip.approxWeightKg),
      isWeighed: false,
    }))
    vehicleTripsStore.push(...trips)

    const harvest: Harvest = {
      id: harvestId,
      seasonRegistrationId: input.seasonRegistrationId,
      harvestDate: input.harvestDate,
      supervisorName: input.supervisorName,
      supervisorContact: input.supervisorContact,
      createdBy: 2,
      vehicleTrips: trips,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    harvestsStore.push(harvest)

    context.registration.status = 'Harvested (partial)'
    context.registration.updatedAt = new Date().toISOString()

    return harvest
  },
}
