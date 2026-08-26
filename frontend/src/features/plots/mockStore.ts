import type { SeasonRegistrationStatus } from '@/types/season'
import { farmerLocations, farmersStore } from '@/features/farmers/mockStore'
import type { FieldQc, OverallObservation, Plot, QcResult, SeasonRegistration } from './types'

/**
 * Shared in-memory mock store for plots/season-registrations/field-QC —
 * imported by both the plots feature and the seasonRegistrations feature
 * (which is a read-only view over the same underlying join table, per
 * Business_Rules R12 / PHASE_MAP.md §7). A real backend would just be one
 * database; this mirrors that with one shared module instead of two mocks
 * drifting out of sync.
 *
 * Seeded 2026-08-11 for the CEO demo: 150 plots across 100 farmers, 120
 * season registrations spanning every pipeline status, with matching Field
 * QC records. Note: the real `Plot` type has a single `variety` field (no
 * `plot_varieties` join table exists in code) — "1-2 varieties per plot" is
 * represented as separate Plot rows, which is how this data model already
 * handles multiple varieties per farmer.
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
const rand = mulberry32(20260212)
function randInt(min: number, max: number) {
  return Math.floor(rand() * (max - min + 1)) + min
}
function pick<T>(arr: readonly T[]): T {
  return arr[randInt(0, arr.length - 1)]
}
function randomDateBetween(start: string, end: string): string {
  const startMs = new Date(start).getTime()
  const endMs = new Date(end).getTime()
  return new Date(startMs + rand() * (endMs - startMs)).toISOString().slice(0, 10)
}
function addDays(date: string, days: number): string {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}
function decimal(min: number, max: number, digits = 1): string {
  return (rand() * (max - min) + min).toFixed(digits)
}

/** Task-requested varieties mapped onto the real `GrapeVariety` union (no exact match for "Sonaka Seedless"/"Black Seedless"/"Crimson Seedless"). */
const DEMO_VARIETIES = ['Thompson Seedless', 'Sonaka', 'Black Jumbo Seedless', 'Crimson', 'Sharad Seedless'] as const

const FIELD_WORKER_IDS = [2, 3, 9]

function nextMhNumber(counter: number): string {
  return `MH06${String(counter).padStart(8, '0')}`
}

function buildPlotsSeed(): Plot[] {
  const plots: Plot[] = []
  let plotId = 1
  let mhCounter = 1

  for (const farmer of farmersStore) {
    // Farmers 1-50 get 1 plot; farmers 51-100 get 2 plots — 50 + 100 = 150 total.
    const plotCount = farmer.id <= 50 ? 1 : 2
    const location = farmerLocations[farmer.id]

    for (let i = 1; i <= plotCount; i++) {
      const pruningDate = randomDateBetween('2025-08-01', '2025-10-15')
      plots.push({
        id: plotId,
        farmerId: farmer.id,
        plotNumber: `P${i}`,
        mhRegistrationNumber: nextMhNumber(mhCounter++),
        variety: pick([...DEMO_VARIETIES]),
        areaAcres: decimal(1.5, 4.5, 2),
        village: location?.village,
        taluka: location?.taluka,
        surveyNo: `${randInt(50, 400)}/${randInt(1, 9)}`,
        gpsLat: decimal(19.9, 20.3, 4),
        gpsLong: decimal(73.6, 74.0, 4),
        pruningDate,
        approxHarvestDate: randomDateBetween('2026-01-15', '2026-03-15'),
        createdAt: now,
        updatedAt: now,
      })
      plotId++
    }
  }
  return plots
}

export const plotsStore: Plot[] = buildPlotsSeed()

/**
 * Exact status distribution requested for the demo (sums to 120):
 * 15 Registered, 10 Field QC Failed, 30 Field QC Passed, 10 Lab Failed,
 * 25 Lab Passed, 20 Under Contract, 5 Harvested (partial), 3 Weighed,
 * 2 Arrival QC Passed. Assigned to the first 120 of the 150 plots — the
 * remaining 30 plots simply haven't been registered for this season yet.
 */
const STATUS_DISTRIBUTION: Array<[SeasonRegistrationStatus, number]> = [
  ['Registered', 15],
  ['Field QC Failed', 10],
  ['Field QC Passed', 30],
  ['Lab Failed', 10],
  ['Lab Passed', 25],
  ['Under Contract', 20],
  ['Harvested (partial)', 5],
  ['Weighed', 3],
  ['Arrival QC Passed', 2],
]

function buildStatusSequence(): SeasonRegistrationStatus[] {
  const sequence: SeasonRegistrationStatus[] = []
  for (const [status, count] of STATUS_DISTRIBUTION) {
    for (let i = 0; i < count; i++) sequence.push(status)
  }
  return sequence
}

/** Every status past 'Registered' and 'Field QC Failed' necessarily passed Field QC. */
function fieldQcResultFor(status: SeasonRegistrationStatus): QcResult {
  return status === 'Field QC Failed' ? 'Fail' : 'Pass'
}

const OBSERVATIONS: OverallObservation[] = ['Good', 'Very Good', 'Excellent']

function buildSeasonRegistrationsAndFieldQc(): { registrations: SeasonRegistration[]; fieldQc: FieldQc[] } {
  const registrations: SeasonRegistration[] = []
  const fieldQc: FieldQc[] = []
  const statusSequence = buildStatusSequence()

  let regId = 1
  let fieldQcId = 1

  statusSequence.forEach((status, index) => {
    const plot = plotsStore[index]
    const registeredBy = pick(FIELD_WORKER_IDS)
    const registeredAt = randomDateBetween('2025-12-01', '2026-01-15')

    registrations.push({
      id: regId,
      plotId: plot.id,
      seasonYear: 2026,
      status,
      registeredBy,
      registeredAt: new Date(registeredAt).toISOString(),
      createdAt: now,
      updatedAt: now,
    })

    if (status !== 'Registered') {
      const inspectionDate = plot.approxHarvestDate ? addDays(plot.approxHarvestDate, -randInt(30, 45)) : registeredAt
      fieldQc.push({
        id: fieldQcId,
        seasonRegistrationId: regId,
        inspectionDate,
        fruitColour: pick(['Green', 'Milky Green', 'Yellow']),
        tssPercent: decimal(14, 22),
        thripsPercent: decimal(0, 8),
        bhuriPercent: decimal(0, 5),
        blackSpotPercent: decimal(0, 3),
        cercosporaPercent: decimal(0, 2),
        overallObservation: pick(OBSERVATIONS),
        exportableFruitPercent: decimal(70, 95),
        result: fieldQcResultFor(status),
        inspectedBy: pick(FIELD_WORKER_IDS),
        createdAt: now,
        updatedAt: now,
      })
      fieldQcId++
    }

    regId++
  })

  return { registrations, fieldQc }
}

const { registrations: seasonRegistrationsSeed, fieldQc: fieldQcSeed } = buildSeasonRegistrationsAndFieldQc()

export const seasonRegistrationsStore: SeasonRegistration[] = seasonRegistrationsSeed
export const fieldQcStore: FieldQc[] = fieldQcSeed

export let nextPlotId = plotsStore.length + 1
export let nextRegistrationId = seasonRegistrationsStore.length + 1
export let nextFieldQcId = fieldQcStore.length + 1

export function allocatePlotId() {
  return nextPlotId++
}
export function allocateRegistrationId() {
  return nextRegistrationId++
}
export function allocateFieldQcId() {
  return nextFieldQcId++
}

/** Exposed for downstream mock generators (labSamples, contracts, harvests) that need to find registrations by status. */
export function registrationsByStatus(...statuses: SeasonRegistrationStatus[]): SeasonRegistration[] {
  return seasonRegistrationsStore.filter((r) => statuses.includes(r.status))
}

/** Small helper other mock generators need (plot lookup for a registration) — avoids re-deriving the join everywhere. */
export function plotForRegistration(registration: SeasonRegistration): Plot | undefined {
  return plotsStore.find((p) => p.id === registration.plotId)
}
