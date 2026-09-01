import { ApiError } from '@/api/httpClient'
import { mockDelay } from '@/api/mockDelay'
import { companySettingsApiMock } from '@/features/companySettings/api.mock'
import { contractsStore } from '@/features/contracts/mockStore'
import { customersStore } from '@/features/customers/mockStore'
import { farmersStore } from '@/features/farmers/mockStore'
import { harvestsStore } from '@/features/harvests/mockStore'
import { fieldQcStore, plotsStore, seasonRegistrationsStore } from '@/features/plots/mockStore'
import { labSamplesStore } from '@/features/labSamples/mockStore'
import { bomEntriesStore } from '@/features/bom/mockStore'
import { materialsStore, productsStore } from '@/features/itemMaster/mockStore'
import { recordAutoStockOut } from '@/features/inventory/mockStore'
import type { EntityId } from '@/types/common'
import { allocatePackagingId, mockGenerateLotId, packagingStore } from './mockStore'
import type {
  CreatePackagingInput,
  EligibleHarvestForPackaging,
  PackagingDetail,
  PackagingRecord,
  PackagingRow,
  PackagingTraceability,
} from './types'

function resolveHarvestContext(harvestId: EntityId) {
  const harvest = harvestsStore.find((h) => h.id === harvestId)
  if (!harvest) return null
  const registration = seasonRegistrationsStore.find((r) => r.id === harvest.seasonRegistrationId)
  if (!registration) return null
  const plot = plotsStore.find((p) => p.id === registration.plotId)
  if (!plot) return null
  const farmer = farmersStore.find((f) => f.id === plot.farmerId)
  if (!farmer) return null
  const contract = contractsStore.find((c) => c.seasonRegistrationId === registration.id)
  if (!contract) return null
  return { harvest, registration, plot, farmer, contract }
}

export const packagingApiMock = {
  /** Harvests belonging to an Arrival-QC-passed registration — multiple packing runs per harvest are allowed (R31). */
  async listEligibleHarvests(): Promise<EligibleHarvestForPackaging[]> {
    await mockDelay()
    return harvestsStore
      .map((h): EligibleHarvestForPackaging | null => {
        const context = resolveHarvestContext(h.id)
        if (!context) return null
        if (context.registration.status !== 'Arrival QC Passed' && context.registration.status !== 'Packed') return null
        return {
          harvestId: h.id,
          farmerName: context.farmer.name,
          plotNumber: context.plot.plotNumber,
          variety: context.plot.variety,
          harvestDate: h.harvestDate,
          packingRunsSoFar: packagingStore.filter((p) => p.harvestId === h.id).length,
        }
      })
      .filter((row): row is EligibleHarvestForPackaging => row !== null)
  },

  async list(): Promise<PackagingRow[]> {
    await mockDelay()
    return packagingStore
      .map((record) => {
        const context = resolveHarvestContext(record.harvestId)
        if (!context) return null
        const customer = customersStore.find((c) => c.id === record.customerId)
        return { record, farmerName: context.farmer.name, plotNumber: context.plot.plotNumber, customerName: customer?.name ?? 'Unknown' }
      })
      .filter((row): row is PackagingRow => row !== null)
  },

  async getById(id: EntityId): Promise<PackagingDetail> {
    await mockDelay()
    const record = packagingStore.find((p) => p.id === id)
    if (!record) throw new ApiError(404, { message: 'Packaging record not found.' })
    const context = resolveHarvestContext(record.harvestId)
    if (!context) throw new ApiError(404, { message: 'Related plot/farmer record not found.' })
    const customer = customersStore.find((c) => c.id === record.customerId)

    const fieldQc = fieldQcStore.filter((q) => q.seasonRegistrationId === context.registration.id).at(-1)
    const labSample = labSamplesStore.find((s) => s.seasonRegistrationId === context.registration.id)

    const traceability: PackagingTraceability = {
      farmerId: context.farmer.id,
      farmerName: context.farmer.name,
      plotId: context.plot.id,
      plotNumber: context.plot.plotNumber,
      mhRegistrationNumber: context.plot.mhRegistrationNumber,
      seasonYear: context.registration.seasonYear,
      fieldQcResult: fieldQc?.result,
      labResult: labSample?.result,
    }

    return { record, customerName: customer?.name ?? 'Unknown', traceability }
  },

  async create(input: CreatePackagingInput): Promise<PackagingRecord> {
    await mockDelay(500)

    const context = resolveHarvestContext(input.harvestId)
    if (!context) throw new ApiError(404, { message: 'Harvest not found.' })
    if (context.registration.status !== 'Arrival QC Passed' && context.registration.status !== 'Packed') {
      throw new ApiError(409, { message: 'This record cannot continue until Arrival QC has passed.' })
    }

    // Fixed 7% deduction, founder-confirmed — not read from the contract
    // (Business_Rules R28, rewritten). Mirrors backend FARMER_REJECTION_PCT.
    const FARMER_REJECTION_PCT = 7
    const contractRejectionKg = Math.round(input.totalWeightKg * (FARMER_REJECTION_PCT / 100) * 100) / 100
    const netWeightKg = Math.round((input.totalWeightKg - input.actualRejectionKg) * 100) / 100
    const actualRejectionPct = Math.round((input.actualRejectionKg / input.totalWeightKg) * 100 * 100) / 100

    const settings = await companySettingsApiMock.get()
    const sequence = packagingStore.filter((p) => p.harvestId === input.harvestId).length + 1

    const record: PackagingRecord = {
      id: allocatePackagingId(),
      harvestId: input.harvestId,
      date: input.date,
      slipNo: input.slipNo,
      lotId: mockGenerateLotId(context.plot.mhRegistrationNumber, input.date, sequence),
      packSize: input.packSize,
      complianceType: input.complianceType,
      customerId: input.customerId,
      totalWeightKg: String(input.totalWeightKg),
      contractRejectionKg: String(contractRejectionKg),
      actualRejectionKg: String(input.actualRejectionKg),
      actualRejectionPct: String(actualRejectionPct),
      netWeightKg: String(netWeightKg),
      numBoxes: input.numBoxes,
      numPallets: input.numPallets,
      ggnNumber: settings.ggnNumber,
      createdBy: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    packagingStore.push(record)

    context.registration.status = 'Packed'
    context.registration.updatedAt = new Date().toISOString()

    autoDeductPackingMaterials(record)

    return record
  },
}

/**
 * Service-layer hook (CLAUDE.md §9): on packaging save, look up BOM entries
 * scaled `per_box` for the matching finished product, multiply
 * `qtyPerBox` by `numBoxes`, and record the deduction. Per-container
 * materials (angle boards, pallets, clips, straps) are deliberately NOT
 * touched here — they wait for the future Container Loading phase. Runs
 * silently; the packaging worker never sees this and a missing BOM/product
 * just means no deduction happens rather than blocking the save.
 */
function autoDeductPackingMaterials(record: PackagingRecord) {
  const context = resolveHarvestContext(record.harvestId)
  if (!context) return

  const product = productsStore.find(
    (p) =>
      p.isActive &&
      p.variety === context.plot.variety &&
      p.customerId === record.customerId &&
      p.packSize === record.packSize &&
      p.complianceType === record.complianceType,
  )
  if (!product) return

  const perBoxEntries = bomEntriesStore.filter((entry) => {
    if (entry.productId !== product.id || entry.qtyPerBox === undefined) return false
    const material = materialsStore.find((m) => m.id === entry.materialId)
    return material?.scaleLevel === 'per_box'
  })

  for (const entry of perBoxEntries) {
    recordAutoStockOut(entry.materialId, Number(entry.qtyPerBox) * record.numBoxes, record.id, record.date ?? new Date().toISOString())
  }
}
