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
 *
 * The previous version (`farmerNameForHarvest`) re-fetched *all*
 * registrations and walked their harvests from scratch on every single
 * call, and was called once per lot inside two separate loops — an N×M
 * pattern, not just N+1. Replaced with one bulk resolution per top-level
 * call: fetch registrations/plots/farmers once, fetch each registration's
 * harvests in parallel, and build a harvestId -> farmerName map so the
 * per-lot loops become plain synchronous lookups.
 */
async function loadFarmerNamesByHarvest(): Promise<Map<EntityId, string>> {
  const [registrations, plots, farmers] = await Promise.all([
    httpClient.get<SeasonRegistration[]>('/registrations'),
    httpClient.get<Plot[]>('/plots'),
    httpClient.get<Farmer[]>('/farmers'),
  ])

  const perRegistration = await Promise.all(
    registrations.map(async (registration): Promise<Array<readonly [EntityId, string]>> => {
      const harvests = await httpClient.get<Harvest[]>(`/registrations/${registration.id}/harvests`)
      const plot = plots.find((p) => p.id === registration.plotId)
      if (!plot) {
        console.warn(`[palletisation] registration ${registration.id}: plot ${registration.plotId} not found in /plots — skipping`)
        return []
      }
      const farmer = farmers.find((f) => f.id === plot.farmerId)
      if (!farmer) {
        console.warn(`[palletisation] registration ${registration.id}: farmer ${plot.farmerId} not found in /farmers — skipping`)
        return []
      }
      return harvests.map((h) => [h.id, farmer.name] as const)
    }),
  )

  return new Map(perRegistration.flat())
}

export const palletisationApiReal = {
  async listAvailableLots(): Promise<AvailableLot[]> {
    const [records, pallets, customers, farmerNames] = await Promise.all([
      httpClient.get<PackagingRecord[]>('/packaging'),
      httpClient.get<Pallet[]>('/pallets'),
      httpClient.get<Customer[]>('/customers'),
      loadFarmerNamesByHarvest(),
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
        farmerName: farmerNames.get(record.harvestId) ?? 'Unknown',
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
    const [pallet, records, customers, farmerNames] = await Promise.all([
      httpClient.get<Pallet>(`/pallets/${id}`),
      httpClient.get<PackagingRecord[]>('/packaging'),
      httpClient.get<Customer[]>('/customers'),
      loadFarmerNamesByHarvest(),
    ])

    const lots = pallet.lots.map((lot) => {
      const record = records.find((r) => r.id === lot.packagingRecordId)
      const customer = record && customers.find((c) => c.id === record.customerId)
      return {
        lot,
        lotId: record?.lotId ?? 'Unknown lot',
        farmerName: record ? farmerNames.get(record.harvestId) ?? 'Unknown' : 'Unknown',
        customerName: customer?.name ?? 'Unknown',
      }
    })

    return { pallet, lots }
  },

  create: (input: CreatePalletInput) => httpClient.post<Pallet>('/pallets', input),
}
