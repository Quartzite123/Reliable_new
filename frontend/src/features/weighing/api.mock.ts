import { ApiError } from '@/api/httpClient'
import { mockDelay } from '@/api/mockDelay'
import { companySettingsApiMock } from '@/features/companySettings/api.mock'
import { contractsStore } from '@/features/contracts/mockStore'
import { farmersStore } from '@/features/farmers/mockStore'
import { allocateWeighingId, harvestsStore, vehicleTripsStore, weighingRecordsStore } from '@/features/harvests/mockStore'
import { plotsStore, seasonRegistrationsStore } from '@/features/plots/mockStore'
import type { EntityId } from '@/types/common'
import type { CreateWeighingInput, WeighingContext, WeighingRecord, WeighingRow } from './types'

const DEFAULT_CRATE_TARE_WEIGHT_KG = 1.6

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
  const contract = contractsStore.find((c) => c.seasonRegistrationId === registration.id)
  if (!contract) return null
  return { trip, harvest, registration, plot, farmer, contract }
}

async function crateTareWeightKg(): Promise<number> {
  const settings = await companySettingsApiMock.get()
  return settings.crateTareWeightKg ? Number(settings.crateTareWeightKg) : DEFAULT_CRATE_TARE_WEIGHT_KG
}

export const weighingApiMock = {
  async getContext(vehicleTripId: EntityId): Promise<WeighingContext> {
    await mockDelay(200)
    const context = resolveTripContext(vehicleTripId)
    if (!context) throw new ApiError(404, { message: 'Vehicle trip or contract not found.' })
    return {
      vehicleTripId,
      harvestId: context.harvest.id,
      vehicleNo: context.trip.vehicleNo,
      driverName: context.trip.driverName,
      harvestNumCrates: context.trip.numCrates,
      approxWeightKg: context.trip.approxWeightKg,
      farmerName: context.farmer.name,
      variety: context.plot.variety,
      harvestDate: context.harvest.harvestDate,
      mhNumber: context.plot.mhRegistrationNumber,
      villageName: context.plot.village,
      contractRejectionPct: context.contract.rejectionPercent,
    }
  },

  async list(): Promise<WeighingRow[]> {
    await mockDelay()
    return weighingRecordsStore
      .map((record): WeighingRow | null => {
        const context = resolveTripContext(record.vehicleTripId)
        if (!context) return null
        return { record, farmerName: context.farmer.name, vehicleNo: context.trip.vehicleNo }
      })
      .filter((row): row is WeighingRow => row !== null)
  },

  async getById(id: EntityId): Promise<WeighingRow> {
    await mockDelay()
    const record = weighingRecordsStore.find((r) => r.id === id)
    if (!record) throw new ApiError(404, { message: 'Weighing record not found.' })
    const context = resolveTripContext(record.vehicleTripId)
    if (!context) throw new ApiError(404, { message: 'Related trip/farmer record not found.' })
    return { record, farmerName: context.farmer.name, vehicleNo: context.trip.vehicleNo }
  },

  async create(input: CreateWeighingInput): Promise<WeighingRecord> {
    await mockDelay(500)

    const context = resolveTripContext(input.vehicleTripId)
    if (!context) throw new ApiError(404, { message: 'Vehicle trip or contract not found.' })
    if (weighingRecordsStore.some((w) => w.vehicleTripId === input.vehicleTripId)) {
      throw new ApiError(409, { message: 'This vehicle trip has already been weighed.' })
    }

    const tareRate = await crateTareWeightKg()
    const tareWeightKg = Math.round(input.crateCountAtWeighing * tareRate * 100) / 100
    const netFruitWeightKg = Math.round((input.grossWeightKg - tareWeightKg) * 100) / 100
    const total = netFruitWeightKg // "Gross Weight" on the slip = post-tare, pre-rejection

    // Server-computed in the real backend from the contract's rejection_percent
    // snapshot — mirrored here (CLAUDE.md §9). Farmer liability is capped at
    // the contract rate; the exporter absorbs any excess actual rejection
    // (Business_Rules R28) — never hardcode 7%, always read from the contract.
    const contractPct = Number(context.contract.rejectionPercent)
    const actualPct = input.actualRejectionPct
    const appliedPct = Math.min(actualPct, contractPct)
    const rejectionKg = Math.round(total * (appliedPct / 100) * 100) / 100
    const netWeightKg = Math.round((total - rejectionKg) * 100) / 100

    const crateMismatch = context.trip.numCrates !== undefined && input.crateCountAtWeighing !== context.trip.numCrates

    const record: WeighingRecord = {
      id: allocateWeighingId(),
      vehicleTripId: input.vehicleTripId,
      date: input.date,
      slipNo: input.slipNo,
      supervisorName: input.supervisorName,
      numCrates: input.crateCountAtWeighing,
      totalWeightKg: total.toFixed(2),
      rejectionPct: contractPct.toFixed(2),
      actualRejectionPct: actualPct.toFixed(2),
      rejectionKg: rejectionKg.toFixed(2),
      netWeightKg: netWeightKg.toFixed(2),
      slipPhotoUrl: input.slipPhoto ? URL.createObjectURL(input.slipPhoto) : undefined,
      slipSerialNo: input.slipSerialNo,
      loadId: input.loadId,
      harvesterNo: input.harvesterNo,
      noCrtReci: input.noCrtReci,
      knitting: input.knitting,
      produceType: input.produceType ?? 'Grapes',
      averageSize: input.averageSize,
      averageSugar: input.averageSugar !== undefined ? input.averageSugar.toFixed(2) : undefined,
      villageName: input.villageName,
      contactNo: input.contactNo,
      crateTareWeightKg: tareRate.toFixed(2),
      crateCountAtWeighing: input.crateCountAtWeighing,
      grossWeightKg: input.grossWeightKg.toFixed(2),
      tareWeightKg: tareWeightKg.toFixed(2),
      netFruitWeightKg: netFruitWeightKg.toFixed(2),
      crateMismatch,
      crateMismatchMessage: crateMismatch
        ? `Harvest recorded ${context.trip.numCrates} crates for this trip, but weighing recorded ${input.crateCountAtWeighing}.`
        : undefined,
      createdBy: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    weighingRecordsStore.push(record)
    context.trip.isWeighed = true
    context.trip.crateCountAtWeighing = record.crateCountAtWeighing
    context.trip.grossWeightKg = record.grossWeightKg
    context.trip.tareWeightKg = record.tareWeightKg
    context.trip.netFruitWeightKg = record.netFruitWeightKg

    // Registration moves to "Weighed" once every trip across all its harvests has a weighing record (PHASE_MAP.md §4).
    const allTripsForRegistration = harvestsStore
      .filter((h) => h.seasonRegistrationId === context.registration.id)
      .flatMap((h) => vehicleTripsStore.filter((t) => t.harvestId === h.id))
    const allWeighed = allTripsForRegistration.every((t) => weighingRecordsStore.some((w) => w.vehicleTripId === t.id))
    if (allWeighed) {
      context.registration.status = 'Weighed'
      context.registration.updatedAt = new Date().toISOString()
    }

    return record
  },
}
