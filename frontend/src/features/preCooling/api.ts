import { httpClient } from '@/api/httpClient'
import type { EntityId } from '@/types/common'
import type { Pallet } from '@/features/palletisation'
import type {
  CompletePreCoolingInput,
  CreatePreCoolingInput,
  EligiblePalletForPreCooling,
  PreCoolingRecord,
  PreCoolingRow,
} from './types'

/**
 * No `/pre-cooling/eligible-pallets` or `GET /pre-cooling/{id}` route exists
 * (verified via openapi.json — only `POST/GET /pre-cooling` and
 * `PATCH /pre-cooling/{record_id}/complete`). Eligible pallets are pallets
 * with status `created` that have no pre-cooling record yet, composed from
 * `/pallets` + `/pre-cooling`.
 */
export const preCoolingApiReal = {
  async listEligiblePallets(): Promise<EligiblePalletForPreCooling[]> {
    const [pallets, records] = await Promise.all([
      httpClient.get<Pallet[]>('/pallets'),
      httpClient.get<PreCoolingRecord[]>('/pre-cooling'),
    ])
    const alreadyLogged = new Set(records.map((r) => r.palletId))
    return pallets
      .filter((p) => p.status === 'created' && !alreadyLogged.has(p.id))
      .map((p) => ({ palletId: p.id, palletLabel: p.palletId, palletType: p.palletType, totalBoxes: p.totalBoxes ?? 0 }))
  },

  async list(): Promise<PreCoolingRow[]> {
    const [records, pallets] = await Promise.all([
      httpClient.get<PreCoolingRecord[]>('/pre-cooling'),
      httpClient.get<Pallet[]>('/pallets'),
    ])
    return records.map((record) => ({
      record,
      palletLabel: pallets.find((p) => p.id === record.palletId)?.palletId ?? 'Unknown pallet',
      isComplete: record.isComplete,
    }))
  },

  async getById(id: EntityId): Promise<PreCoolingRow> {
    const rows = await preCoolingApiReal.list()
    const row = rows.find((r) => r.record.id === id)
    if (!row) throw new Error('Pre-cooling record not found.')
    return row
  },

  create: (input: CreatePreCoolingInput) =>
    httpClient.post<PreCoolingRecord[]>('/pre-cooling', {
      palletIds: input.palletIds,
      date: input.date,
      numBoxes: input.numBoxes,
      inTime: input.inTime,
      inBerryTemp: input.inBerryTemp,
    }),

  complete: (id: EntityId, input: CompletePreCoolingInput) =>
    httpClient.patch<PreCoolingRecord>(`/pre-cooling/${id}/complete`, input),
}
