import { httpClient } from '@/api/httpClient'
import type { EntityId } from '@/types/common'
import type { Farmer } from '@/features/farmers'
import type { Harvest } from '@/features/harvests'
import type { Plot, SeasonRegistration } from '@/features/plots'
import type { ArrivalQc, ArrivalQcDetail, ArrivalQcInput, ArrivalQcRow, EligibleHarvestForArrivalQc } from './types'

/**
 * No `/arrival-qc/eligible-harvests` or global `GET /arrival-qc` route
 * exists on the real backend (verified via openapi.json — the only routes
 * are `POST`/`GET /harvests/{harvest_id}/arrival-qc`). Everything below is
 * composed client-side by walking `/registrations` -> harvests.
 */
async function loadAllHarvestsWithContext() {
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

export const arrivalQcApiReal = {
  async listEligibleHarvests(): Promise<EligibleHarvestForArrivalQc[]> {
    const all = await loadAllHarvestsWithContext()
    const rows: EligibleHarvestForArrivalQc[] = []
    for (const { harvest, registration, plot, farmer } of all) {
      if (registration.status !== 'Weighed' && registration.status !== 'Arrival QC Failed') continue
      const history = await httpClient.get<ArrivalQc[]>(`/harvests/${harvest.id}/arrival-qc`)
      const alreadyPassed = history.some((r) => r.result === 'Pass')
      if (alreadyPassed) continue
      rows.push({
        harvestId: harvest.id,
        farmerName: farmer.name,
        plotNumber: plot.plotNumber,
        harvestDate: harvest.harvestDate,
        seasonYear: registration.seasonYear,
      })
    }
    return rows
  },

  async list(): Promise<ArrivalQcRow[]> {
    const all = await loadAllHarvestsWithContext()
    const rows: ArrivalQcRow[] = []
    for (const { harvest, plot, farmer } of all) {
      const history = await httpClient.get<ArrivalQc[]>(`/harvests/${harvest.id}/arrival-qc`)
      for (const record of history) {
        rows.push({ record, farmerName: farmer.name, plotNumber: plot.plotNumber, harvestDate: harvest.harvestDate })
      }
    }
    return rows
  },

  async getByHarvest(harvestId: EntityId): Promise<ArrivalQcDetail> {
    const all = await loadAllHarvestsWithContext()
    const found = all.find((row) => row.harvest.id === harvestId)
    if (!found) throw new Error('Harvest not found.')
    const history = await httpClient.get<ArrivalQc[]>(`/harvests/${harvestId}/arrival-qc`)
    return {
      harvestId,
      farmerName: found.farmer.name,
      plotNumber: found.plot.plotNumber,
      harvestDate: found.harvest.harvestDate,
      history,
    }
  },

  create: (input: ArrivalQcInput) =>
    httpClient.post<ArrivalQc>(`/harvests/${input.harvestId}/arrival-qc`, {
      inspectionDate: input.inspectionDate,
      fruitColourGreenPct: input.fruitColourGreenPct,
      fruitColourMilkyPct: input.fruitColourMilkyPct,
      fruitColourYellowPct: input.fruitColourYellowPct,
      tssPercent: input.tssPercent,
      thripsPercent: input.thripsPercent,
      bhuriPercent: input.bhuriPercent,
      blackSpotPercent: input.blackSpotPercent,
      cercosporaPercent: input.cercosporaPercent,
      overallObservation: input.overallObservation,
      result: input.result,
      notes: input.notes,
    }),
}
