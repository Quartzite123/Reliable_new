export type SeasonStatus = 'active' | 'closed'

export interface Season {
  id: string
  year: number
  startDate: string
  endDate: string
  notes?: string
  status: SeasonStatus
  createdAt: string
  updatedAt: string
}

export interface CreateSeasonInput {
  year: number
  startDate: string
  endDate: string
  notes?: string
}

export interface UpdateSeasonInput {
  id: string
  year: number
  startDate: string
  endDate: string
  notes?: string
}
