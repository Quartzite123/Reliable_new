import type { EntityId } from '@/types/common'
import type { Pallet } from './types'

export const palletsStore: Pallet[] = []

let nextPalletId = 1
let nextPalletisationLotId = 1

export function allocatePalletId() {
  return nextPalletId++
}
export function allocatePalletisationLotId() {
  return nextPalletisationLotId++
}

/**
 * Mock stand-in for backend Pallet ID generation — format unresolved
 * (Open_Questions.md #10, PHASE_MAP.md's own example is illustrative only:
 * `2026-P001`). Never treat this as a final rule.
 */
export function mockGeneratePalletId(date: string, sequence: number): string {
  const year = date.slice(0, 4)
  return `${year}-P${String(sequence).padStart(3, '0')}`
}

export function boxesAlreadyAssigned(packagingRecordId: EntityId): number {
  return palletsStore
    .flatMap((p) => p.lots)
    .filter((l) => l.packagingRecordId === packagingRecordId)
    .reduce((sum, l) => sum + l.numBoxes, 0)
}
