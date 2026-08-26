import { ApiError } from '@/api/httpClient'
import { mockDelay } from '@/api/mockDelay'
import type { EntityId } from '@/types/common'
import { farmersStore } from '@/features/farmers/mockStore'
import { harvestsStore, vehicleTripsStore, weighingRecordsStore } from '@/features/harvests/mockStore'
import { plotsStore, seasonRegistrationsStore } from '@/features/plots/mockStore'
import { allocateGoodsReceivingId, goodsReceivingStore } from './mockStore'
import type { EligibleTripForGoodsReceiving, GoodsReceivingInput, GoodsReceivingRecord, GoodsReceivingRow } from './types'

function resolveTripContext(vehicleTripId: EntityId) {
  const trip = vehicleTripsStore.find((t) => t.id === vehicleTripId)
  if (!trip) return null
  const harvest = harvestsStore.find((h) => h.id === trip.harvestId)
  if (!harvest) return null
  const registration = seasonRegistrationsStore.find((r) => r.id === harvest.seasonRegistrationId)
  if (!registration) return null
  const plot = plotsStore.find((p) => p.id === registration.plotId)
  if (!plot) return null
  const farmer = farmersStore.find((f) => f.id === plot.farmerId)
  if (!farmer) return null
  return { trip, harvest, registration, plot, farmer }
}

export const goodsReceivingApiMock = {
  /** Vehicle trips that have been weighed and don't have a receiving confirmation yet. */
  async listEligibleTrips(): Promise<EligibleTripForGoodsReceiving[]> {
    await mockDelay()
    return vehicleTripsStore
      .filter(
        (trip) =>
          weighingRecordsStore.some((w) => w.vehicleTripId === trip.id) &&
          !goodsReceivingStore.some((g) => g.vehicleTripId === trip.id),
      )
      .map((trip) => {
        const context = resolveTripContext(trip.id)
        return context
          ? {
              vehicleTripId: trip.id,
              vehicleNo: trip.vehicleNo,
              farmerName: context.farmer.name,
              plotNumber: context.plot.plotNumber,
              harvestDate: context.harvest.harvestDate,
            }
          : null
      })
      .filter((row): row is EligibleTripForGoodsReceiving => row !== null)
  },

  async list(): Promise<GoodsReceivingRow[]> {
    await mockDelay()
    return goodsReceivingStore
      .map((record) => {
        const context = resolveTripContext(record.vehicleTripId)
        if (!context) return null
        return { record, vehicleNo: context.trip.vehicleNo, farmerName: context.farmer.name, plotNumber: context.plot.plotNumber }
      })
      .filter((row): row is GoodsReceivingRow => row !== null)
  },

  async create(input: GoodsReceivingInput): Promise<GoodsReceivingRecord> {
    await mockDelay(500)

    const context = resolveTripContext(input.vehicleTripId)
    if (!context) throw new ApiError(404, { message: 'Vehicle trip not found.' })
    if (!weighingRecordsStore.some((w) => w.vehicleTripId === input.vehicleTripId)) {
      throw new ApiError(409, { message: 'This record cannot continue until Weighing is completed.' })
    }
    if (goodsReceivingStore.some((g) => g.vehicleTripId === input.vehicleTripId)) {
      throw new ApiError(409, { message: 'This vehicle trip has already been confirmed as received.' })
    }

    const record: GoodsReceivingRecord = {
      id: allocateGoodsReceivingId(),
      vehicleTripId: input.vehicleTripId,
      receivedCrates: input.receivedCrates,
      receivedWeightKg: input.receivedWeightKg,
      acceptedWeightKg: input.acceptedWeightKg,
      rejectedWeightKg: input.rejectedWeightKg,
      warehouseLocation: input.warehouseLocation,
      notes: input.notes,
      status: 'confirmed',
      createdBy: 'current-user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    goodsReceivingStore.push(record)
    return record
  },
}
