import { ApiError } from '@/api/httpClient'
import { mockDelay } from '@/api/mockDelay'
import { customersStore } from '@/features/customers/mockStore'
import { farmersStore } from '@/features/farmers/mockStore'
import { harvestsStore } from '@/features/harvests/mockStore'
import { packagingStore } from '@/features/packaging/mockStore'
import { plotsStore, seasonRegistrationsStore } from '@/features/plots/mockStore'
import type { EntityId } from '@/types/common'
import { allocatePalletId, allocatePalletisationLotId, boxesAlreadyAssigned, mockGeneratePalletId, palletsStore } from './mockStore'
import type { AvailableLot, CreatePalletInput, Pallet, PalletDetail, PalletRow } from './types'

function farmerNameForPackagingRecord(harvestId: EntityId): string {
  const harvest = harvestsStore.find((h) => h.id === harvestId)
  const registration = harvest && seasonRegistrationsStore.find((r) => r.id === harvest.seasonRegistrationId)
  const plot = registration && plotsStore.find((p) => p.id === registration.plotId)
  const farmer = plot && farmersStore.find((f) => f.id === plot.farmerId)
  return farmer?.name ?? 'Unknown'
}

export const palletisationApiMock = {
  /** Packing lots with boxes not yet fully assigned to a pallet — a pallet may span multiple lots (R35). */
  async listAvailableLots(): Promise<AvailableLot[]> {
    await mockDelay()
    return packagingStore
      .map((record): AvailableLot | null => {
        const remainingBoxes = record.numBoxes - boxesAlreadyAssigned(record.id)
        if (remainingBoxes <= 0) return null
        const customer = customersStore.find((c) => c.id === record.customerId)
        return {
          packagingRecordId: record.id,
          lotId: record.lotId,
          farmerName: farmerNameForPackagingRecord(record.harvestId),
          customerName: customer?.name ?? 'Unknown',
          packSize: record.packSize,
          totalBoxes: record.numBoxes,
          remainingBoxes,
        }
      })
      .filter((row): row is AvailableLot => row !== null)
  },

  async list(): Promise<PalletRow[]> {
    await mockDelay()
    return palletsStore.map((pallet) => ({ pallet, lotCount: pallet.lots.length }))
  },

  async getById(id: EntityId): Promise<PalletDetail> {
    await mockDelay()
    const pallet = palletsStore.find((p) => p.id === id)
    if (!pallet) throw new ApiError(404, { message: 'Pallet not found.' })

    const lots = pallet.lots.map((lot) => {
      const record = packagingStore.find((r) => r.id === lot.packagingRecordId)
      const customer = record && customersStore.find((c) => c.id === record.customerId)
      return {
        lot,
        lotId: record?.lotId ?? 'Unknown lot',
        farmerName: record ? farmerNameForPackagingRecord(record.harvestId) : 'Unknown',
        customerName: customer?.name ?? 'Unknown',
      }
    })

    return { pallet, lots }
  },

  async create(input: CreatePalletInput): Promise<Pallet> {
    await mockDelay(500)

    if (input.lots.length === 0) {
      throw new ApiError(400, { message: 'Add at least one lot to this pallet.' })
    }

    for (const lotInput of input.lots) {
      const record = packagingStore.find((r) => r.id === lotInput.packagingRecordId)
      if (!record) throw new ApiError(404, { message: 'One of the selected lots could not be found.' })
      const remaining = record.numBoxes - boxesAlreadyAssigned(record.id)
      if (lotInput.numBoxes > remaining) {
        throw new ApiError(409, {
          message: `Lot ${record.lotId} only has ${remaining} boxes left to assign.`,
        })
      }
    }

    const totalBoxes = input.lots.reduce((sum, l) => sum + l.numBoxes, 0)
    const sequence = palletsStore.length + 1

    const pallet: Pallet = {
      id: allocatePalletId(),
      palletId: mockGeneratePalletId(input.date, sequence),
      date: input.date,
      palletType: input.palletType,
      totalBoxes,
      notes: input.notes,
      status: 'created',
      createdBy: 2,
      lots: input.lots.map((lotInput) => {
        const record = packagingStore.find((r) => r.id === lotInput.packagingRecordId)
        return {
          id: allocatePalletisationLotId(),
          packagingRecordId: lotInput.packagingRecordId,
          numBoxes: lotInput.numBoxes,
          lotId: record?.lotId,
        }
      }),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    palletsStore.push(pallet)

    return pallet
  },
}
