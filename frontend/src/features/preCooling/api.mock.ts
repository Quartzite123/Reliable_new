import { ApiError } from '@/api/httpClient'
import { mockDelay } from '@/api/mockDelay'
import { palletsStore } from '@/features/palletisation/mockStore'
import type { EntityId } from '@/types/common'
import { allocatePreCoolingId, preCoolingRecordsStore } from './mockStore'
import type {
  CompletePreCoolingInput,
  CreatePreCoolingInput,
  EligiblePalletForPreCooling,
  PreCoolingRecord,
  PreCoolingRow,
} from './types'

function palletLabel(palletId: EntityId): string {
  return palletsStore.find((p) => p.id === palletId)?.palletId ?? 'Unknown pallet'
}

export const preCoolingApiMock = {
  /** Pallets not yet logged into pre-cooling (Business_Rules R37-ish, prompt.md §18). */
  async listEligiblePallets(): Promise<EligiblePalletForPreCooling[]> {
    await mockDelay()
    const alreadyLogged = new Set(preCoolingRecordsStore.map((r) => r.palletId))
    return palletsStore
      .filter((p) => p.status === 'created' && !alreadyLogged.has(p.id))
      .map((p) => ({ palletId: p.id, palletLabel: p.palletId, palletType: p.palletType, totalBoxes: p.totalBoxes ?? 0 }))
  },

  async list(): Promise<PreCoolingRow[]> {
    await mockDelay()
    return preCoolingRecordsStore.map((record) => ({
      record,
      palletLabel: palletLabel(record.palletId),
      isComplete: record.isComplete,
    }))
  },

  async getById(id: EntityId): Promise<PreCoolingRow> {
    await mockDelay()
    const record = preCoolingRecordsStore.find((r) => r.id === id)
    if (!record) throw new ApiError(404, { message: 'Pre-cooling record not found.' })
    return { record, palletLabel: palletLabel(record.palletId), isComplete: record.isComplete }
  },

  /** One record created per pallet — mirrors the real backend's batch-entry-fans-out-to-rows behaviour. */
  async create(input: CreatePreCoolingInput): Promise<PreCoolingRecord[]> {
    await mockDelay(500)

    if (input.palletIds.length === 0) {
      throw new ApiError(400, { message: 'Select at least one pallet.' })
    }

    const records: PreCoolingRecord[] = input.palletIds.map((palletId) => {
      const pallet = palletsStore.find((p) => p.id === palletId)
      if (pallet) pallet.status = 'pre_cooling'
      return {
        id: allocatePreCoolingId(),
        palletId,
        date: input.date,
        numPallets: input.palletIds.length,
        numBoxes: input.numBoxes,
        inTime: input.inTime,
        inBerryTemp: String(input.inBerryTemp),
        isComplete: false,
        createdBy: 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    })
    preCoolingRecordsStore.push(...records)

    return records
  },

  async complete(id: EntityId, input: CompletePreCoolingInput): Promise<PreCoolingRecord> {
    await mockDelay(400)
    const record = preCoolingRecordsStore.find((r) => r.id === id)
    if (!record) throw new ApiError(404, { message: 'Pre-cooling record not found.' })

    record.outTime = input.outTime
    record.outBerryTemp = String(input.outBerryTemp)
    record.isComplete = true
    record.updatedAt = new Date().toISOString()

    return record
  },
}
