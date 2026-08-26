import { httpClient } from '@/api/httpClient'
import type { EntityId } from '@/types/common'
import type { Farmer } from '@/features/farmers'
import type { Plot, SeasonRegistration } from '@/features/plots'
import type { CreateLabSampleInput, EligiblePlotForLab, LabSample, LabSampleReference, LabSampleRow } from './types'

/**
 * The real backend models lab samples 1:1 with a registration
 * (`GET/POST /registrations/{reg_id}/lab-sample`, singular — not a list),
 * and has no global `GET /lab-samples` or `/lab-samples/eligible-plots`
 * route (verified via openapi.json). `GET /lab-samples/queue` returns the
 * registrations eligible for sampling directly. Everything else here is
 * composed client-side.
 */
async function buildReference(seasonRegistrationId: EntityId): Promise<LabSampleReference> {
  const registration = await httpClient.get<SeasonRegistration>(`/registrations/${seasonRegistrationId}`)
  const plot = await httpClient.get<Plot>(`/plots/${registration.plotId}`)
  const farmer = await httpClient.get<Farmer>(`/farmers/${plot.farmerId}`)
  return {
    farmerName: farmer.name,
    plotNumber: plot.plotNumber,
    mhRegistrationNumber: plot.mhRegistrationNumber,
    variety: plot.variety,
    village: plot.village,
    taluka: plot.taluka,
    surveyNo: plot.surveyNo,
    gpsLat: plot.gpsLat !== undefined ? Number(plot.gpsLat) : undefined,
    gpsLong: plot.gpsLong !== undefined ? Number(plot.gpsLong) : undefined,
    seasonYear: registration.seasonYear,
  }
}

async function loadAllSamples() {
  const registrations = await httpClient.get<SeasonRegistration[]>('/registrations')
  const rows: LabSampleRow[] = []
  for (const registration of registrations) {
    let sample: LabSample | null = null
    try {
      sample = await httpClient.get<LabSample>(`/registrations/${registration.id}/lab-sample`)
    } catch {
      continue
    }
    if (!sample) continue
    const reference = await buildReference(registration.id)
    rows.push({ sample, reference })
  }
  return rows
}

export const labSamplesApiReal = {
  async listEligiblePlots(): Promise<EligiblePlotForLab[]> {
    const registrations = await httpClient.get<SeasonRegistration[]>('/lab-samples/queue')
    const rows: EligiblePlotForLab[] = []
    for (const r of registrations) {
      const reference = await buildReference(r.id)
      rows.push({ seasonRegistrationId: r.id, reference })
    }
    return rows
  },

  list: () => loadAllSamples(),

  async getById(id: EntityId): Promise<LabSampleRow> {
    const all = await loadAllSamples()
    const found = all.find((row) => row.sample.id === id)
    if (!found) throw new Error('Lab sample not found.')
    return found
  },

  getReference: (seasonRegistrationId: EntityId) => buildReference(seasonRegistrationId),

  async create(input: CreateLabSampleInput): Promise<LabSample> {
    let sample = await httpClient.post<LabSample>(`/registrations/${input.seasonRegistrationId}/lab-sample`, {
      labName: input.labName,
      samplingDate: input.samplingDate,
      sealNo: input.sealNo,
      varietyConfirmed: input.varietyConfirmed,
      areaHa2a: input.areaHa2a,
      yield4bMt: input.yield4bMt,
      remark: input.remark,
      tssValue: input.tssValue,
      result: input.result,
    })

    if (input.sealPhoto) {
      const formData = new FormData()
      formData.append('file', input.sealPhoto)
      sample = await httpClient.post<LabSample>(`/lab-samples/${sample.id}/seal-photo`, formData)
    }
    if (input.documents2a4b) {
      const formData = new FormData()
      formData.append('file', input.documents2a4b)
      sample = await httpClient.post<LabSample>(`/lab-samples/${sample.id}/documents`, formData)
    }

    return sample
  },
}
