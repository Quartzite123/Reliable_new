import type { PreCoolingRecord } from './types'

export const preCoolingRecordsStore: PreCoolingRecord[] = []

let nextPreCoolingId = 1
export function allocatePreCoolingId() {
  return nextPreCoolingId++
}
