import type { EntityId } from '@/types/common'
import type { BankDetails, Farmer } from './types'

/** Shared in-memory mock store — exported so other feature mocks (e.g. seasonRegistrations) can join on it, mirroring what a real backend join query would do. */
const now = new Date().toISOString()

/** Tiny deterministic PRNG (mulberry32) — stable across reloads so the CEO demo looks the same every time, unlike `Math.random()`. */
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
const rand = mulberry32(20260211)
function randInt(min: number, max: number) {
  return Math.floor(rand() * (max - min + 1)) + min
}
function pick<T>(arr: readonly T[]): T {
  return arr[randInt(0, arr.length - 1)]
}

const FIRST_NAMES = [
  'Somnath', 'Ashok', 'Ramesh', 'Suresh', 'Vijay', 'Prakash', 'Santosh', 'Dilip', 'Manoj', 'Kishor',
  'Anil', 'Fakira', 'Mahendra', 'Nilesh', 'Nivruti', 'Ramdas', 'Ramnath', 'Shamrao', 'Sharad', 'Shivaji',
  'Chandrabhan', 'Chhaya', 'Dashrat', 'Latabai', 'Mukund', 'Namdeo', 'Rajendra', 'Shashikala', 'Sujit', 'Vasant',
  'Sunil', 'Nitin', 'Sagar', 'Rakesh', 'Sandip', 'Kondaji', 'Sampat', 'Jayshree', 'Alka', 'Sharipat',
]
const LAST_NAMES = [
  'Bagul', 'Valake', 'Rajode', 'Medhane', 'Apsunde', 'Gholap', 'Kadam', 'Rajole', 'Dhumal', 'Loharkar',
  'Palvi', 'Ugale', 'Bhalerao', 'Gavhane', 'Ghadage', 'Rajwade', 'Patil', 'Murkuthe', 'Walke', 'Malode', 'Porje',
]

export const VILLAGES = [
  'Mohadi', 'Karanjgaon', 'Khedale', 'Jambutke', 'Dindori', 'Nandurmadhemeshwar', 'Vadangali', 'Deogaon',
  'Varkheda', 'Manori', 'Bopegaon', 'Korhate', 'Pimparkhed', 'Chendikapur', 'Ambaner', 'Ravlas Pimpri',
  'Nandurmanur', 'Tisgaon', 'Karanjali',
]
export const TALUKAS = ['Dindori', 'Niphad'] as const

/**
 * Village/taluka aren't fields on the `Farmer` type (address is a single
 * free-text string) — this side table exists purely so `plots/mockStore.ts`
 * can generate each farmer's plots in the *same* village/taluka as their
 * farmer record, without re-deriving it by parsing the address string.
 */
export const farmerLocations: Record<EntityId, { village: string; taluka: (typeof TALUKAS)[number] }> = {}

function buildFarmersSeed(): Farmer[] {
  const farmers: Farmer[] = []
  const usedNames = new Set<string>()
  let id = 1
  while (farmers.length < 100) {
    const first = FIRST_NAMES[(id * 7 + 3) % FIRST_NAMES.length]
    const last = LAST_NAMES[(id * 11 + 5) % LAST_NAMES.length]
    const name = `${first} ${last}`
    if (usedNames.has(name)) {
      id++
      continue
    }
    usedNames.add(name)

    const village = pick(VILLAGES)
    const taluka = pick(TALUKAS)
    farmerLocations[id] = { village, taluka }

    const mobile = `9${randInt(0, 9)}${String(randInt(0, 99999999)).padStart(8, '0')}`
    // ~80% active / 20% inactive.
    const status = farmers.length < 80 ? 'active' : 'inactive'

    farmers.push({
      id,
      name,
      address: `At Post ${village}, Tal. ${taluka}, Dist. Nashik`,
      mobile,
      status,
      createdAt: now,
      updatedAt: now,
    })
    id++
  }
  return farmers
}

export const farmersStore: Farmer[] = buildFarmersSeed()

/** ~60 of the 100 farmers have bank details on file already; the rest don't yet (Business_Rules R6 — not required to register the farmer). */
export const bankDetailsStore = new Map<number, BankDetails>()

const BANKS = ['Bank of Maharashtra', 'State Bank of India', 'Nashik Merchant’s Co-op Bank', 'HDFC Bank', 'Punjab National Bank']
let nextBankDetailsId = 1
for (const farmer of farmersStore) {
  if (farmer.id > 60) continue // farmers 61-100 have no bank details yet
  const bank = pick(BANKS)
  bankDetailsStore.set(farmer.id, {
    id: nextBankDetailsId++,
    farmerId: farmer.id,
    accountHolderName: farmer.name,
    bankName: bank,
    accountNumber: String(randInt(100000000000, 999999999999)),
    ifscCode: `${bank.slice(0, 4).toUpperCase().replace(/[^A-Z]/g, 'X').padEnd(4, 'X')}0${randInt(100000, 999999)}`,
    branchName: farmerLocations[farmer.id]?.village,
    createdAt: now,
    updatedAt: now,
  })
}

export let nextFarmerId = farmersStore.length + 1

export function allocateFarmerId() {
  return nextFarmerId++
}
export function allocateBankDetailsId() {
  return nextBankDetailsId++
}
