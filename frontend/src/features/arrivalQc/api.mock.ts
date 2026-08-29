import { ApiError } from '@/api/httpClient'
import { mockDelay } from '@/api/mockDelay'
import { farmersStore } from '@/features/farmers/mockStore'
import { harvestsStore } from '@/features/harvests/mockStore'
import { plotsStore, seasonRegistrationsStore } from '@/features/plots/mockStore'
import type { EntityId } from '@/types/common'
import { allocateArrivalQcId, arrivalQcStore } from './mockStore'
import type { ArrivalQc, ArrivalQcDetail, ArrivalQcInput, ArrivalQcRow, EligibleHarvestForArrivalQc } from './types'

function resolveHarvestContext(harvestId: EntityId) {
  const harvest = harvestsStore.find((h) => h.id === harvestId)
  if (!harvest) return null
  const registration = seasonRegistrationsStore.find((r) => r.id === harvest.seasonRegistrationId)
  if (!registration) return null
  const plot = plotsStore.find((p) => p.id === registration.plotId)
  if (!plot) return null
  const farmer = farmersStore.find((f) => f.id === plot.farmerId)
  if (!farmer) return null
  return { harvest, registration, plot, farmer }
}

export const arrivalQcApiMock = {
  /** Harvests belonging to a Weighed (or previously Arrival-QC-failed) registration that still need a passing inspection. */
  async listEligibleHarvests(): Promise<EligibleHarvestForArrivalQc[]> {
    await mockDelay()
    return harvestsStore
      .filter((h) => {
        const context = resolveHarvestContext(h.id)
        if (!context) return false
        if (context.registration.status !== 'Weighed' && context.registration.status !== 'Arrival QC Failed') return false
        const history = arrivalQcStore.filter((r) => r.harvestId === h.id)
        return history.length === 0 || history[history.length - 1].result === 'Fail'
      })
      .map((h) => {
        const context = resolveHarvestContext(h.id)!
        return {
          harvestId: h.id,
          farmerName: context.farmer.name,
          plotNumber: context.plot.plotNumber,
          harvestDate: h.harvestDate,
          seasonYear: context.registration.seasonYear,
        }
      })
  },

  async list(): Promise<ArrivalQcRow[]> {
    await mockDelay()
    return arrivalQcStore
      .map((record) => {
        const context = resolveHarvestContext(record.harvestId)
        if (!context) return null
        return { record, farmerName: context.farmer.name, plotNumber: context.plot.plotNumber, harvestDate: context.harvest.harvestDate }
      })
      .filter((row): row is ArrivalQcRow => row !== null)
  },

  async getByHarvest(harvestId: EntityId): Promise<ArrivalQcDetail> {
    await mockDelay()
    const context = resolveHarvestContext(harvestId)
    if (!context) throw new ApiError(404, { message: 'Harvest not found.' })
    return {
      harvestId,
      farmerName: context.farmer.name,
      plotNumber: context.plot.plotNumber,
      harvestDate: context.harvest.harvestDate,
      // Mock store still allows multiple rows per harvest (for the demo
      // re-attempt flow) — the real single-record contract only exposes
      // the latest one here, matching what the real backend would return.
      record: arrivalQcStore.filter((r) => r.harvestId === harvestId).at(-1) ?? null,
    }
  },

  async create(input: ArrivalQcInput): Promise<ArrivalQc> {
    await mockDelay(500)

    const context = resolveHarvestContext(input.harvestId)
    if (!context) throw new ApiError(404, { message: 'Harvest not found.' })
    if (context.registration.status !== 'Weighed' && context.registration.status !== 'Arrival QC Failed') {
      throw new ApiError(409, { message: 'This record cannot continue until Weighing is completed.' })
    }

    const record: ArrivalQc = {
      id: allocateArrivalQcId(),
      harvestId: input.harvestId,
      inspectionDate: input.inspectionDate,
      fruitColourGreenPct: String(input.fruitColourGreenPct),
      fruitColourMilkyPct: String(input.fruitColourMilkyPct),
      fruitColourYellowPct: String(input.fruitColourYellowPct),
      tssPercent: String(input.tssPercent),
      thripsPercent: String(input.thripsPercent),
      bhuriPercent: String(input.bhuriPercent),
      blackSpotPercent: String(input.blackSpotPercent),
      cercosporaPercent: String(input.cercosporaPercent),
      overallObservation: input.overallObservation,
      notes: input.notes,
      result: input.result,
      inspectedBy: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    arrivalQcStore.push(record)

    context.registration.status = input.result === 'Pass' ? 'Arrival QC Passed' : 'Arrival QC Failed'
    context.registration.updatedAt = new Date().toISOString()

    return record
  },
}
