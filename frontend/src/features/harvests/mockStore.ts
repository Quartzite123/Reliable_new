import { registrationsByStatus } from '@/features/plots/mockStore'
import type { WeighingRecord } from '@/features/weighing/types'
import type { Harvest, VehicleTrip } from './types'

/**
 * Owned here (not in features/weighing) so both features can read/write one
 * shared table, like a real DB would.
 *
 * Seeded 2026-08-11 for the CEO demo — one harvest (2-4 vehicle trips) per
 * registration at 'Harvested (partial)' or beyond. Registrations at
 * 'Weighed' or 'Arrival QC Passed' have every trip weighed (that's what the
 * status means); 'Harvested (partial)' registrations have trips still
 * awaiting weighing.
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
const rand = mulberry32(20260215)
function randInt(min: number, max: number) {
  return Math.floor(rand() * (max - min + 1)) + min
}
function pick<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)]
}
function randomDateBetween(start: string, end: string): string {
  const startMs = new Date(start).getTime()
  const endMs = new Date(end).getTime()
  return new Date(startMs + rand() * (endMs - startMs)).toISOString().slice(0, 10)
}

const FIELD_WORKER_IDS = [2, 3, 9]
const SUPERVISOR_NAMES = ['Ravindra Shinde', 'Baban Kolhe', 'Anna Pawar']

export const harvestsStore: Harvest[] = []
export const vehicleTripsStore: VehicleTrip[] = []
export const weighingRecordsStore: WeighingRecord[] = []

let nextHarvestId = 1
let nextVehicleTripId = 1
let nextWeighingId = 1

export function allocateHarvestId() {
  return nextHarvestId++
}
export function allocateVehicleTripId() {
  return nextVehicleTripId++
}
export function allocateWeighingId() {
  return nextWeighingId++
}

function seed() {
  const eligible = registrationsByStatus('Harvested (partial)', 'Weighed', 'Arrival QC Passed')

  for (const registration of eligible) {
    const harvestId = allocateHarvestId()
    const fullyWeighed = registration.status === 'Weighed' || registration.status === 'Arrival QC Passed'
    const tripCount = randInt(2, 4)

    const trips: VehicleTrip[] = []
    for (let i = 0; i < tripCount; i++) {
      const numCrates = randInt(150, 280)
      const approxWeightKg = (numCrates * 6.2).toFixed(1)
      trips.push({
        id: allocateVehicleTripId(),
        harvestId,
        vehicleNo: `MH15 ${String(randInt(0, 9999)).padStart(4, '0')}`,
        driverName: pick(SUPERVISOR_NAMES),
        numCrates,
        approxWeightKg,
        isWeighed: fullyWeighed,
      })
    }
    vehicleTripsStore.push(...trips)

    const harvest: Harvest = {
      id: harvestId,
      seasonRegistrationId: registration.id,
      harvestDate: randomDateBetween('2026-01-20', '2026-03-10'),
      supervisorName: pick(SUPERVISOR_NAMES),
      supervisorContact: `9${randInt(0, 9)}${String(randInt(0, 99999999)).padStart(8, '0')}`,
      createdBy: pick(FIELD_WORKER_IDS),
      vehicleTrips: trips,
      createdAt: now,
      updatedAt: now,
    }
    harvestsStore.push(harvest)

    if (fullyWeighed) {
      const tareRate = 1.6
      for (const trip of trips) {
        const numCrates = trip.numCrates ?? 0
        const grossWeightKg = Number(trip.approxWeightKg) * (0.97 + rand() * 0.06) + numCrates * tareRate
        const tareWeightKg = numCrates * tareRate
        const total = grossWeightKg - tareWeightKg // netFruitWeightKg / "Gross Weight" on the slip
        const rejectionKg = total * 0.07
        const netWeightKg = total - rejectionKg
        trip.crateCountAtWeighing = numCrates
        trip.grossWeightKg = grossWeightKg.toFixed(2)
        trip.tareWeightKg = tareWeightKg.toFixed(2)
        trip.netFruitWeightKg = total.toFixed(2)
        weighingRecordsStore.push({
          id: allocateWeighingId(),
          vehicleTripId: trip.id,
          date: harvest.harvestDate,
          slipNo: `WS-2026-${String(randInt(0, 9999)).padStart(4, '0')}`,
          supervisorName: harvest.supervisorName,
          numCrates: trip.numCrates,
          totalWeightKg: total.toFixed(2),
          rejectionPct: '7.00',
          actualRejectionPct: '7.00',
          rejectionKg: rejectionKg.toFixed(2),
          netWeightKg: netWeightKg.toFixed(2),
          produceType: 'Grapes',
          crateTareWeightKg: tareRate.toFixed(2),
          crateCountAtWeighing: trip.numCrates,
          grossWeightKg: grossWeightKg.toFixed(2),
          tareWeightKg: tareWeightKg.toFixed(2),
          netFruitWeightKg: total.toFixed(2),
          crateMismatch: false,
          createdBy: pick(FIELD_WORKER_IDS),
          createdAt: now,
          updatedAt: now,
        })
      }
    }
  }
}

seed()
