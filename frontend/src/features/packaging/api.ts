import { ApiError, httpClient } from '@/api/httpClient'
import type { EntityId } from '@/types/common'
import type { Customer } from '@/features/customers'
import type { Farmer } from '@/features/farmers'
import type { FieldQc, GrapeVariety, Plot, SeasonRegistration } from '@/features/plots'
import type { LabSample } from '@/features/labSamples'
import type { Harvest } from '@/features/harvests'
import type {
  CreatePackagingInput,
  EligibleHarvestForPackaging,
  PackagingDetail,
  PackagingRecord,
  PackagingRow,
} from './types'

/**
 * No `/packaging/eligible-harvests` or `GET /packaging/{id}` route exists on
 * the real backend (verified via openapi.json — the only routes are
 * `POST /harvests/{harvest_id}/packaging` and the global `GET /packaging`).
 * Eligibility and detail-by-id are composed client-side.
 *
 * Reference data (plots, farmers) is fetched once in bulk and joined in
 * memory, and per-registration harvest lookups run in parallel — this body
 * was an exact copy of harvests/api.ts's original for-loop version; both
 * have now been fixed the same way. Never go back to looping one awaited
 * GET per row here.
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
    console.warn(`[packaging] registration ${registration.id}: plot ${registration.plotId} not found in /plots — skipping`)
    return null
  }
  const farmer = farmers.find((f) => f.id === plot.farmerId)
  if (!farmer) {
    console.warn(`[packaging] registration ${registration.id}: farmer ${plot.farmerId} not found in /farmers — skipping`)
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

export const packagingApiReal = {
  async listEligibleHarvests(): Promise<EligibleHarvestForPackaging[]> {
    const [all, packaging] = await Promise.all([
      loadAllHarvestsWithContext(),
      httpClient.get<PackagingRecord[]>('/packaging'),
    ])
    const rows: EligibleHarvestForPackaging[] = []
    for (const { harvest, registration, plot, farmer } of all) {
      if (registration.status !== 'Arrival QC Passed' && registration.status !== 'Packed') continue
      rows.push({
        harvestId: harvest.id,
        farmerName: farmer.name,
        plotNumber: plot.plotNumber,
        // Registration-scoped, not plot.variety (legacy) — also feeds the
        // cascading customer/pack-size dropdown on PackagingNewPage, so
        // getting this wrong on a two-variety plot is a functional bug,
        // not just a display one.
        variety: registration.varietyName as GrapeVariety | undefined,
        harvestDate: harvest.harvestDate,
        packingRunsSoFar: packaging.filter((p) => p.harvestId === harvest.id).length,
      })
    }
    return rows
  },

  list: () => httpClient.get<PackagingRecord[]>('/packaging').then(mapToRows),

  async getById(id: EntityId): Promise<PackagingDetail> {
    const [records, all] = await Promise.all([httpClient.get<PackagingRecord[]>('/packaging'), loadAllHarvestsWithContext()])
    const record = records.find((r) => r.id === id)
    if (!record) throw new Error('Packaging record not found.')
    const context = all.find((row) => row.harvest.id === record.harvestId)
    if (!context) throw new Error('Related harvest/plot/farmer record not found.')

    const customers = await httpClient.get<Customer[]>('/customers')
    const customer = customers.find((c) => c.id === record.customerId)

    // field-qc is a list endpoint — no records yet is a genuine [], not a
    // 404, so any thrown error here is a real failure and must propagate.
    const fieldQc = await httpClient.get<FieldQc[]>(`/registrations/${context.registration.id}/field-qc`)
    const fieldQcResult = fieldQc.at(-1)?.result

    // lab-sample is a single 1:1 record — 404 means "not sampled yet" (the
    // normal case), anything else is a real failure and must propagate.
    let labResult: string | undefined
    try {
      const labSample = await httpClient.get<LabSample>(`/registrations/${context.registration.id}/lab-sample`)
      labResult = labSample.result
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 404)) throw error
    }

    return {
      record,
      customerName: customer?.name ?? 'Unknown',
      traceability: {
        farmerId: context.farmer.id,
        farmerName: context.farmer.name,
        plotId: context.plot.id,
        plotNumber: context.plot.plotNumber,
        mhRegistrationNumber: context.plot.mhRegistrationNumber,
        seasonYear: context.registration.seasonYear,
        fieldQcResult,
        labResult,
      },
    }
  },

  create: (input: CreatePackagingInput) =>
    httpClient.post<PackagingRecord>(`/harvests/${input.harvestId}/packaging`, {
      date: input.date,
      slipNo: input.slipNo,
      customerId: input.customerId,
      packSize: input.packSize,
      complianceType: input.complianceType,
      totalWeightKg: input.totalWeightKg,
      actualRejectionKg: input.actualRejectionKg,
      numBoxes: input.numBoxes,
      numPallets: input.numPallets,
    }),
}

async function mapToRows(records: PackagingRecord[]): Promise<PackagingRow[]> {
  const [all, customers] = await Promise.all([loadAllHarvestsWithContext(), httpClient.get<Customer[]>('/customers')])
  const rows: PackagingRow[] = []
  for (const record of records) {
    const context = all.find((row) => row.harvest.id === record.harvestId)
    if (!context) continue
    const customer = customers.find((c) => c.id === record.customerId)
    rows.push({ record, farmerName: context.farmer.name, plotNumber: context.plot.plotNumber, customerName: customer?.name ?? 'Unknown' })
  }
  return rows
}
