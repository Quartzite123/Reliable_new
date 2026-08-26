import { httpClient } from '@/api/httpClient'
import type { CreateSeasonInput, Season, UpdateSeasonInput } from './types'

export const seasonsApiReal = {
  list: () => httpClient.get<Season[]>('/seasons'),
  getCurrent: () => httpClient.get<Season | null>('/seasons/current'),
  create: (input: CreateSeasonInput) => httpClient.post<Season>('/seasons', input),
  update: (input: UpdateSeasonInput) => httpClient.put<Season>(`/seasons/${input.id}`, input),
}
