import { ApiError, httpClient } from '@/api/httpClient'
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
 *
 * Arrival QC is one-per-harvest and TERMINAL on fail: `arrival_qc.harvest_id`
 * is DB-unique on the backend, and `record_arrival_qc` 409s unconditionally
 * once any record exists, pass or fail — there is no re-inspection path.
 * Do not rebuild a follow-up/re-attempt flow here; it can only ever 409.
 *
 * Reference data (plots, farmers) is fetched once in bulk and joined in
 * memory, and the per-registration harvest lookups run in parallel — same
 * fix as labSamples/api.ts. The previous version awaited three requests
 * per registration in a for-loop (harvests, then plot, then farmer): 16
 * registrations meant ~50 sequential round-trips to a Render free-tier
 * backend. Never loop a per-row GET in series again here.
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
    console.warn(`[arrivalQc] registration ${registration.id}: plot ${registration.plotId} not found in /plots — skipping`)
    return null
  }
  const farmer = farmers.find((f) => f.id === plot.farmerId)
  if (!farmer) {
    console.warn(`[arrivalQc] registration ${registration.id}: farmer ${plot.farmerId} not found in /farmers — skipping`)
    return null
  }
  return { plot, farmer }
}

async function loadAllHarvestsWithContext() {
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

/**
 * GET /harvests/{id}/arrival-qc is a single record, not a list (one per
 * harvest — DB-unique). 404 means "not inspected yet", the normal state
 * for every new harvest, not a failure — return null. Anything else (405,
 * 500, ...) is a real failure and must propagate.
 */
async function getArrivalQcRecord(harvestId: EntityId): Promise<ArrivalQc | null> {
  try {
    return await httpClient.get<ArrivalQc>(`/harvests/${harvestId}/arrival-qc`)
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }
}

export const arrivalQcApiReal = {
  async listEligibleHarvests(): Promise<EligibleHarvestForArrivalQc[]> {
    const all = await loadAllHarvestsWithContext()
    const eligible = all.filter((row) => row.registration.status === 'Weighed')
    const rows = await Promise.all(
      eligible.map(async ({ harvest, registration, plot, farmer }): Promise<EligibleHarvestForArrivalQc | null> => {
        const record = await getArrivalQcRecord(harvest.id)
        if (record) return null
        return {
          harvestId: harvest.id,
          farmerName: farmer.name,
          plotNumber: plot.plotNumber,
          variety: registration.varietyName,
          harvestDate: harvest.harvestDate,
          seasonYear: registration.seasonYear,
        }
      }),
    )
    return rows.filter((r): r is EligibleHarvestForArrivalQc => r !== null)
  },

  async list(): Promise<ArrivalQcRow[]> {
    const all = await loadAllHarvestsWithContext()
    const rows = await Promise.all(
      all.map(async ({ harvest, registration, plot, farmer }): Promise<ArrivalQcRow | null> => {
        const record = await getArrivalQcRecord(harvest.id)
        if (!record) return null
        return {
          record,
          farmerName: farmer.name,
          plotNumber: plot.plotNumber,
          variety: registration.varietyName,
          harvestDate: harvest.harvestDate,
        }
      }),
    )
    return rows.filter((r): r is ArrivalQcRow => r !== null)
  },

  async getByHarvest(harvestId: EntityId): Promise<ArrivalQcDetail> {
    const all = await loadAllHarvestsWithContext()
    const found = all.find((row) => row.harvest.id === harvestId)
    if (!found) throw new Error('Harvest not found.')
    const record = await getArrivalQcRecord(harvestId)
    return {
      harvestId,
      farmerName: found.farmer.name,
      plotNumber: found.plot.plotNumber,
      variety: found.registration.varietyName,
      harvestDate: found.harvest.harvestDate,
      record,
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
