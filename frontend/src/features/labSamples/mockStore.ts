import { plotForRegistration, registrationsByStatus } from '@/features/plots/mockStore'
import type { Lab, LabSample } from './types'

/**
 * Seeded 2026-08-11 for the CEO demo — one lab sample per registration at
 * 'Lab Failed'/'Lab Passed' or beyond (beyond Lab Passed necessarily also
 * passed Lab, since Contract creation gates on it). Note: the requested lab
 * names ("Envirocare Labs Pvt. Ltd.", "Vimta Labs Ltd.", "SGS India Pvt.
 * Ltd.") don't match the real `Lab` union exactly (fixed enum, out of scope
 * to change) — mapped to the closest real values: Envirocare, Vimta, and
 * Bureau Veritas (substituting for SGS, which has no equivalent).
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
const rand = mulberry32(20260213)
function randInt(min: number, max: number) {
  return Math.floor(rand() * (max - min + 1)) + min
}
function pick<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)]
}
function decimal(min: number, max: number, digits = 1): string {
  return (rand() * (max - min) + min).toFixed(digits)
}
function addDays(date: string, days: number): string {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

const LAB_NAMES: Lab[] = ['Envirocare', 'Vimta', 'Bureau Veritas']
const LAB_WORKER_IDS = [4, 10]

function buildLabSamplesSeed(): LabSample[] {
  const samples: LabSample[] = []
  let id = 1
  const eligible = registrationsByStatus('Lab Failed', 'Lab Passed', 'Under Contract', 'Harvested (partial)', 'Weighed', 'Arrival QC Passed')

  for (const registration of eligible) {
    const plot = plotForRegistration(registration)
    const harvestDate = plot?.approxHarvestDate ?? '2026-02-15'
    samples.push({
      id,
      seasonRegistrationId: registration.id,
      labName: pick(LAB_NAMES),
      samplingDate: addDays(harvestDate, -randInt(5, 6)),
      sealNo: `AD-${String(randInt(0, 999999)).padStart(6, '0')}`,
      varietyConfirmed: plot?.variety ?? 'Thompson Seedless',
      areaHa2a: decimal(0.6, 1.8, 2),
      yield4bMt: decimal(4, 12, 2),
      tssValue: decimal(14.5, 21.0, 1),
      result: registration.status === 'Lab Failed' ? 'Fail' : 'Pass',
      enteredBy: pick(LAB_WORKER_IDS),
      createdAt: now,
      updatedAt: now,
    })
    id++
  }
  return samples
}

export const labSamplesStore: LabSample[] = buildLabSamplesSeed()

let nextLabSampleId = labSamplesStore.length + 1
export function allocateLabSampleId() {
  return nextLabSampleId++
}
