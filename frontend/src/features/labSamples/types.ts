import type { EntityId, Timestamped } from '@/types/common'
import type { GrapeVariety } from '@/features/plots'

/** PHASE_MAP.md §8 reference/seed list. */
export type Lab =
  | 'TUV India Ltd'
  | 'Microchem'
  | 'NHRDF'
  | 'NCML'
  | 'Bureau Veritas'
  | 'Vimta'
  | 'Envirocare'
  | 'ITC Ltd'
  | 'Eurofins Scientific'
export const LABS: Lab[] = [
  'TUV India Ltd',
  'Microchem',
  'NHRDF',
  'NCML',
  'Bureau Veritas',
  'Vimta',
  'Envirocare',
  'ITC Ltd',
  'Eurofins Scientific',
]

export type LabResult = 'Pass' | 'Fail'

/**
 * One per season registration (Business_Rules R18-R20) — the real backend
 * models this as a singular `GET/POST /registrations/{reg_id}/lab-sample`,
 * not a list, so a registration has at most one lab sample. Decimal fields
 * are strings on Read (CLAUDE.md §9).
 */
export interface LabSample extends Timestamped {
  id: EntityId
  seasonRegistrationId: EntityId
  labName?: Lab
  samplingDate?: string
  sealNo?: string
  varietyConfirmed?: string
  areaHa2a?: string
  yield4bMt?: string
  sealPhotoUrl?: string
  documents2a4bUrl?: string
  remark?: string
  tssValue?: string
  result: LabResult
  enteredBy: EntityId
}

/** Reference fields the Lab Worker sees read-only, auto-filled from the Plot record (field-ownership principle). */
export interface LabSampleReference {
  farmerName: string
  plotNumber: string
  mhRegistrationNumber?: string
  variety?: GrapeVariety
  village?: string
  taluka?: string
  surveyNo?: string
  gpsLat?: number
  gpsLong?: number
  seasonYear: number
}

export interface EligiblePlotForLab {
  seasonRegistrationId: EntityId
  reference: LabSampleReference
}

export interface CreateLabSampleInput {
  seasonRegistrationId: EntityId
  labName: Lab
  samplingDate: string
  sealNo: string
  varietyConfirmed: string
  areaHa2a: number
  yield4bMt: number
  sealPhoto?: File | null
  documents2a4b?: File | null
  remark?: string
  tssValue: number
  result: LabResult
}

export interface LabSampleRow {
  sample: LabSample
  reference: LabSampleReference
}
