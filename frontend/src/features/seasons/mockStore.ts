import type { Season } from './types'

const SEED_TIMESTAMP = '2025-12-01T00:00:00.000Z'

/**
 * One active season: "2025-26" (Dec 2025 – Apr 2026), seeded 2026-08-11 for
 * the CEO demo. The real `Season` type has no `name`/`is_active`/
 * `created_by` fields (it uses `year: number` + `status: 'active'|'closed'`,
 * and there's no admin-audit field at all) — out of scope to add those here,
 * so `year` is set to 2026 (matching `seasonYear: 2026` used everywhere else
 * in the mock data) and the "2025-26" display label lives in `notes` instead.
 */
export const seasonsStore: Season[] = [
  {
    id: 'season-1',
    year: 2026,
    startDate: '2025-12-01',
    endDate: '2026-04-30',
    notes: '2025-26 — Main grape export season.',
    status: 'active',
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
]

let nextSeasonId = seasonsStore.length + 1
export function allocateSeasonId() {
  return `season-${nextSeasonId++}`
}
