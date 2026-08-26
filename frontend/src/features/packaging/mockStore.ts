import type { PackagingRecord } from './types'

export const packagingStore: PackagingRecord[] = []

let nextPackagingId = 1
export function allocatePackagingId() {
  return nextPackagingId++
}

/**
 * Mock stand-in for backend Lot ID generation — the real rule is still open
 * (Open_Questions.md #1: plot + harvest day + pack type). The frontend must
 * never compute this for real; this only exists so the mock API can return
 * something (CLAUDE.md §9).
 */
export function mockGenerateLotId(mhRegistrationNumber: string | undefined, harvestDate: string, sequence: number): string {
  return `${mhRegistrationNumber ?? 'UNKNOWN'}-${harvestDate.replace(/-/g, '')}-${String(sequence).padStart(2, '0')}`
}
