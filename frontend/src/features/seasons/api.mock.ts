import { ApiError } from '@/api/httpClient'
import { mockDelay } from '@/api/mockDelay'
import { recordAuditEvent } from '@/features/auditLog'
import { allocateSeasonId, seasonsStore } from './mockStore'
import type { CreateSeasonInput, Season, UpdateSeasonInput } from './types'

function nowIso() {
  return new Date().toISOString()
}

function overlaps(startA: string, endA: string, startB: string, endB: string) {
  return startA <= endB && startB <= endA
}

export const seasonsApiMock = {
  async list(): Promise<Season[]> {
    await mockDelay()
    return [...seasonsStore].sort((a, b) => b.startDate.localeCompare(a.startDate))
  },

  async getCurrent(): Promise<Season | null> {
    await mockDelay(150)
    const active = seasonsStore.find((s) => s.status === 'active')
    if (active) return active
    return [...seasonsStore].sort((a, b) => b.startDate.localeCompare(a.startDate))[0] ?? null
  },

  async create(input: CreateSeasonInput): Promise<Season> {
    await mockDelay(400)
    const clash = seasonsStore.some((s) => overlaps(s.startDate, s.endDate, input.startDate, input.endDate))
    if (clash) {
      throw new ApiError(409, { message: 'A season already exists that overlaps this period.' })
    }
    const timestamp = nowIso()
    const season: Season = {
      id: allocateSeasonId(),
      year: input.year,
      startDate: input.startDate,
      endDate: input.endDate,
      notes: input.notes,
      status: 'active',
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    seasonsStore.push(season)
    recordAuditEvent({ action: 'Season created', module: 'Seasons', result: 'success', recordRef: String(season.year) })
    return season
  },

  async update(input: UpdateSeasonInput): Promise<Season> {
    await mockDelay(400)
    const season = seasonsStore.find((s) => s.id === input.id)
    if (!season) throw new ApiError(404, { message: 'Season not found.' })
    const clash = seasonsStore.some(
      (s) => s.id !== input.id && overlaps(s.startDate, s.endDate, input.startDate, input.endDate),
    )
    if (clash) {
      throw new ApiError(409, { message: 'A season already exists that overlaps this period.' })
    }
    season.year = input.year
    season.startDate = input.startDate
    season.endDate = input.endDate
    season.notes = input.notes
    season.updatedAt = nowIso()
    recordAuditEvent({ action: 'Season edited', module: 'Seasons', result: 'success', recordRef: String(season.year) })
    return season
  },
}
