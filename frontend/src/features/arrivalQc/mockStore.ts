import { harvestsStore } from '@/features/harvests/mockStore'
import { registrationsByStatus } from '@/features/plots/mockStore'
import type { OverallObservation } from '@/features/plots'
import type { ArrivalQc } from './types'

/**
 * Seeded 2026-08-11 for the CEO demo — one arrival QC record per harvest
 * belonging to a registration at 'Arrival QC Passed'. Note: the real
 * `ArrivalQc` type splits fruit colour into three percentage fields
 * (green/milky/yellow), not a single categorical "fruit_colour" value as
 * requested — represented a green- or milky-dominant reading through those
 * three fields instead.
 */
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
const rand = mulberry32(20260216)
function randInt(min: number, max: number) {
  return Math.floor(rand() * (max - min + 1)) + min
}
function pick<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)]
}
function decimal(min: number, max: number, digits = 1): string {
  return (rand() * (max - min) + min).toFixed(digits)
}

const FIELD_WORKER_IDS = [2, 3, 9]
const OBSERVATIONS: OverallObservation[] = ['Good', 'Very Good', 'Excellent']

function buildArrivalQcSeed(): ArrivalQc[] {
  const records: ArrivalQc[] = []
  let id = 1
  const eligible = registrationsByStatus('Arrival QC Passed')

  for (const registration of eligible) {
    const harvest = harvestsStore.find((h) => h.seasonRegistrationId === registration.id)
    if (!harvest) continue

    const greenDominant = rand() > 0.5
    const dominantPct = decimal(70, 90)
    const remainder = (100 - Number(dominantPct)).toFixed(1)

    records.push({
      id,
      harvestId: harvest.id,
      inspectionDate: harvest.harvestDate,
      fruitColourGreenPct: greenDominant ? dominantPct : remainder,
      fruitColourMilkyPct: greenDominant ? remainder : dominantPct,
      fruitColourYellowPct: '0',
      tssPercent: decimal(15, 20),
      thripsPercent: decimal(0, 3),
      bhuriPercent: decimal(0, 2),
      blackSpotPercent: decimal(0, 1.5),
      cercosporaPercent: decimal(0, 1),
      overallObservation: pick(OBSERVATIONS),
      result: 'Pass',
      inspectedBy: pick(FIELD_WORKER_IDS),
      createdAt: now,
      updatedAt: now,
    })
    id++
  }
  return records
}

export const arrivalQcStore: ArrivalQc[] = buildArrivalQcSeed()

let nextArrivalQcId = arrivalQcStore.length + 1
export function allocateArrivalQcId() {
  return nextArrivalQcId++
}
