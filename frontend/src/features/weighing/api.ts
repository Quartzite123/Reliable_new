import { httpClient } from '@/api/httpClient'
import type { EntityId } from '@/types/common'
import type { CreateWeighingInput, WeighingContext, WeighingRecord, WeighingRow } from './types'

interface PendingTripApi {
  id: EntityId
  harvestId: EntityId
  vehicleNo?: string
  driverName?: string
  numCrates?: number
  approxWeightKg?: string
  farmerName: string
  variety?: string
  harvestDate: string
}

/**
 * The Phase 6 backend now exposes `GET /weighing?harvest_id=` and
 * `GET /weighing/{id}` (weighing slip #937 addendum), so the in-memory
 * session cache this file used to need is gone.
 *
 * One real gap remains, and it's not worked around here: `PendingTripRead`
 * (the only endpoint with farmer/plot context) only lists trips that are
 * NOT yet weighed — once a trip is weighed it drops out of `/weighing/pending`,
 * and no other endpoint attaches farmer name, vehicle number, or MH number
 * to an already-weighed record. So against the real API:
 *   - `getContext` can supply mhNumber/villageName only for a still-pending
 *     trip's own context call — it can't, because `PendingTripRead` doesn't
 *     carry those fields either. They come back `undefined` here; the UI
 *     shows "—" rather than inventing data.
 *   - `list`/`getById` return records with `farmerName`/`vehicleNo` left
 *     `undefined` — the UI falls back to "Vehicle Trip #{id}".
 * Flagged in the final report rather than solved by adding backend routes,
 * since backend changes are out of scope for this task.
 */
export const weighingApiReal = {
  async getContext(vehicleTripId: EntityId): Promise<WeighingContext> {
    const pending = await httpClient.get<PendingTripApi[]>('/weighing/pending')
    const trip = pending.find((t) => t.id === vehicleTripId)
    if (!trip) throw new Error('This vehicle trip is not pending weighing (already weighed, or not found).')
    return {
      vehicleTripId: trip.id,
      harvestId: trip.harvestId,
      vehicleNo: trip.vehicleNo,
      driverName: trip.driverName,
      harvestNumCrates: trip.numCrates,
      approxWeightKg: trip.approxWeightKg,
      farmerName: trip.farmerName,
      variety: trip.variety,
      harvestDate: trip.harvestDate,
      // Not available on PendingTripRead — see file docstring.
      mhNumber: undefined,
      villageName: undefined,
    }
  },

  async list(): Promise<WeighingRow[]> {
    const records = await httpClient.get<WeighingRecord[]>('/weighing')
    return records.map((record) => ({ record, farmerName: undefined, vehicleNo: undefined }))
  },

  async getById(id: EntityId): Promise<WeighingRow> {
    const record = await httpClient.get<WeighingRecord>(`/weighing/${id}`)
    return { record, farmerName: undefined, vehicleNo: undefined }
  },

  async create(input: CreateWeighingInput): Promise<WeighingRecord> {
    let record = await httpClient.post<WeighingRecord>(`/vehicle-trips/${input.vehicleTripId}/weighing`, {
      date: input.date,
      slipSerialNo: input.slipSerialNo,
      slipNo: input.slipNo,
      loadId: input.loadId,
      harvesterNo: input.harvesterNo,
      noCrtReci: input.noCrtReci,
      knitting: input.knitting,
      produceType: input.produceType,
      averageSize: input.averageSize,
      averageSugar: input.averageSugar,
      villageName: input.villageName,
      contactNo: input.contactNo,
      supervisorName: input.supervisorName,
      crateCountAtWeighing: input.crateCountAtWeighing,
      grossWeightKg: input.grossWeightKg,
      actualRejectionPct: input.actualRejectionPct,
    })

    if (input.slipPhoto) {
      const formData = new FormData()
      formData.append('file', input.slipPhoto)
      record = await httpClient.post<WeighingRecord>(`/weighing/${record.id}/slip-photo`, formData)
    }

    return record
  },
}
