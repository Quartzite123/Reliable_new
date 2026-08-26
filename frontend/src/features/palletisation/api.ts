import { httpClient } from '@/api/httpClient'
import type { EntityId } from '@/types/common'
import type { Customer } from '@/features/customers'
import type { Farmer } from '@/features/farmers'
import type { PackagingRecord } from '@/features/packaging'
import type { Harvest } from '@/features/harvests'
import type { Plot, SeasonRegistration } from '@/features/plots'
import type { AvailableLot, CreatePalletInput, Pallet, PalletDetail, PalletRow } from './types'

/**
 * No `/palletisation/*` routes exist — the real backend mounts this at
 * `/pallets` (`POST/GET /pallets`, `GET /pallets/{pallet_pk}`), with no
 * `available-lots` helper endpoint (verified via openapi.json). Available
 * lots are composed client-side from `/packaging` + `/pallets`; farmer name
 * resolution reuses the harvest -> registration -> plot -> farmer walk.
 */
async function farmerNameForHarvest(harvestId: EntityId): Promise<string> {
  // No direct GET /harvests/{id} — walk registrations to find the owning one.
  const registrations = await httpClient.get<SeasonRegistration[]>('/registrations')
  for (const registration of registrations) {
    const harvests = await httpClient.get<Harvest[]>(`/registrations/${registration.id}/harvests`)
    if (harvests.some((h) => h.id === harvestId)) {
      const plot = await httpClient.get<Plot>(`/plots/${registration.plotId}`)
      const farmer = await httpClient.get<Farmer>(`/farmers/${plot.farmerId}`)
      return farmer.name
    }
  }
  return 'Unknown'
}

export const palletisationApiReal = {
  async listAvailableLots(): Promise<AvailableLot[]> {
    const [records, pallets, customers] = await Promise.all([
      httpClient.get<PackagingRecord[]>('/packaging'),
      httpClient.get<Pallet[]>('/pallets'),
      httpClient.get<Customer[]>('/customers'),
    ])
    const assigned = new Map<EntityId, number>()
    for (const pallet of pallets) {
      for (const lot of pallet.lots) {
        assigned.set(lot.packagingRecordId, (assigned.get(lot.packagingRecordId) ?? 0) + lot.numBoxes)
      }
    }

    const rows: AvailableLot[] = []
    for (const record of records) {
      const remainingBoxes = record.numBoxes - (assigned.get(record.id) ?? 0)
      if (remainingBoxes <= 0) continue
      const customer = customers.find((c) => c.id === record.customerId)
      rows.push({
        packagingRecordId: record.id,
        lotId: record.lotId,
        farmerName: await farmerNameForHarvest(record.harvestId),
        customerName: customer?.name ?? 'Unknown',
        packSize: record.packSize,
        totalBoxes: record.numBoxes,
        remainingBoxes,
      })
    }
    return rows
  },

  async list(): Promise<PalletRow[]> {
    const pallets = await httpClient.get<Pallet[]>('/pallets')
    return pallets.map((pallet) => ({ pallet, lotCount: pallet.lots.length }))
  },

  async getById(id: EntityId): Promise<PalletDetail> {
    const [pallet, records, customers] = await Promise.all([
      httpClient.get<Pallet>(`/pallets/${id}`),
      httpClient.get<PackagingRecord[]>('/packaging'),
      httpClient.get<Customer[]>('/customers'),
    ])

    const lots = []
    for (const lot of pallet.lots) {
      const record = records.find((r) => r.id === lot.packagingRecordId)
      const customer = record && customers.find((c) => c.id === record.customerId)
      lots.push({
        lot,
        lotId: record?.lotId ?? 'Unknown lot',
        farmerName: record ? await farmerNameForHarvest(record.harvestId) : 'Unknown',
        customerName: customer?.name ?? 'Unknown',
      })
    }

    return { pallet, lots }
  },

  create: (input: CreatePalletInput) => httpClient.post<Pallet>('/pallets', input),
}
