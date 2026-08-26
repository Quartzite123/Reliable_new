import { httpClient } from '@/api/httpClient'
import type { EntityId } from '@/types/common'
import type { Customer } from '@/features/customers'
import type { Contract } from '@/features/contracts'
import type { Farmer } from '@/features/farmers'
import type { FieldQc, Plot, SeasonRegistration } from '@/features/plots'
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

export const packagingApiReal = {
  async listEligibleHarvests(): Promise<EligibleHarvestForPackaging[]> {
    const [all, contracts, packaging] = await Promise.all([
      loadAllHarvestsWithContext(),
      httpClient.get<Contract[]>('/contracts'),
      httpClient.get<PackagingRecord[]>('/packaging'),
    ])
    const rows: EligibleHarvestForPackaging[] = []
    for (const { harvest, registration, plot, farmer } of all) {
      if (registration.status !== 'Arrival QC Passed' && registration.status !== 'Packed') continue
      const contract = contracts.find((c) => c.seasonRegistrationId === registration.id)
      rows.push({
        harvestId: harvest.id,
        farmerName: farmer.name,
        plotNumber: plot.plotNumber,
        variety: plot.variety,
        harvestDate: harvest.harvestDate,
        contractRejectionPercent: contract ? Number(contract.rejectionPercent) : 7,
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

    let fieldQcResult: string | undefined
    let labResult: string | undefined
    try {
      const fieldQc = await httpClient.get<FieldQc[]>(`/registrations/${context.registration.id}/field-qc`)
      fieldQcResult = fieldQc.at(-1)?.result
    } catch {
      // no field QC on record
    }
    try {
      const labSample = await httpClient.get<LabSample>(`/registrations/${context.registration.id}/lab-sample`)
      labResult = labSample.result
    } catch {
      // no lab sample on record
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
