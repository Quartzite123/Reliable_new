import { registrationsByStatus } from '@/features/plots/mockStore'
import type { Contract } from './types'

/** Seeded 2026-08-11 for the CEO demo — one contract per registration at 'Under Contract' or beyond. */
const now = new Date().toISOString()

function mulberry32(seed: number) {
  let a = seed
  return function rand() {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = mulberry32(20260214)
function randInt(min: number, max: number) {
  return Math.floor(rand() * (max - min + 1)) + min
}
function pick<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)]
}
function decimal(min: number, max: number, digits = 2): string {
  return (rand() * (max - min) + min).toFixed(digits)
}
function randomDateBetween(start: string, end: string): string {
  const startMs = new Date(start).getTime()
  const endMs = new Date(end).getTime()
  return new Date(startMs + rand() * (endMs - startMs)).toISOString().slice(0, 10)
}

const OFFICE_WORKER_IDS = [5, 6, 7, 12]

function buildContractsSeed(): Contract[] {
  const contracts: Contract[] = []
  let id = 1
  const eligible = registrationsByStatus('Under Contract', 'Harvested (partial)', 'Weighed', 'Arrival QC Passed')

  for (const registration of eligible) {
    contracts.push({
      id,
      seasonRegistrationId: registration.id,
      contractDate: randomDateBetween('2025-12-01', '2026-01-31'),
      ratePerKg: decimal(45.0, 75.0),
      rejectionPercent: '7.00',
      createdBy: pick(OFFICE_WORKER_IDS),
      createdAt: now,
      updatedAt: now,
    })
    id++
  }
  return contracts
}

export const contractsStore: Contract[] = buildContractsSeed()

export let nextContractId = contractsStore.length + 1
export function allocateContractId() {
  return nextContractId++
}
