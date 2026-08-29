import { ApiError, httpClient } from '@/api/httpClient'
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
 *
 * IMPORTANT: there is no `GET /plots/{id}` or `GET /farmers/{id}` on this
 * backend — only `PATCH /plots/{id}` exists at that path (a GET there is a
 * 405, not a 404), and farmers have no per-id GET at all. Reference data
 * must always be joined client-side from the bulk `GET /plots` / `GET
 * /farmers` list endpoints, fetched once per screen — same pattern as
 * `plots/api.ts` and `seasonRegistrations/api.ts`. Never loop a per-row
 * `GET /plots/{id}` call; it will 405.
 */
function toReference(plot: Plot, farmer: Farmer, seasonYear: number): LabSampleReference {
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
    seasonYear,
  }
}

async function loadPlotsAndFarmers(): Promise<{ plots: Plot[]; farmers: Farmer[] }> {
  const [plots, farmers] = await Promise.all([
    httpClient.get<Plot[]>('/plots'),
    httpClient.get<Farmer[]>('/farmers'),
  ])
  return { plots, farmers }
}

/**
 * Returns null (and warns) if the registration's plot or farmer is missing
 * from the bulk lists — this should never happen (every plot has a farmer,
 * every registration has a plot), so a dropped row here is a real data
 * integrity problem, not a normal "not found yet" case. Silently filtering
 * it out of a list would just look like a shorter-than-expected list with
 * no explanation.
 */
function buildReferenceFrom(
  registration: SeasonRegistration,
  plots: Plot[],
  farmers: Farmer[],
): LabSampleReference | null {
  const plot = plots.find((p) => p.id === registration.plotId)
  if (!plot) {
    console.warn(
      `[labSamples] registration ${registration.id}: plot ${registration.plotId} not found in /plots — dropping this row`,
    )
    return null
  }
  const farmer = farmers.find((f) => f.id === plot.farmerId)
  if (!farmer) {
    console.warn(
      `[labSamples] registration ${registration.id}: farmer ${plot.farmerId} (for plot ${plot.id}) not found in /farmers — dropping this row`,
    )
    return null
  }
  return toReference(plot, farmer, registration.seasonYear)
}

async function loadAllSamples(): Promise<LabSampleRow[]> {
  const [registrations, { plots, farmers }] = await Promise.all([
    httpClient.get<SeasonRegistration[]>('/registrations'),
    loadPlotsAndFarmers(),
  ])

  // Parallel, not serial — each registration's lab-sample lookup is an
  // independent request, and serial round-trips are expensive on Render's
  // free tier. A 404 legitimately means "no sample recorded for this
  // registration yet" and is skipped; anything else (405, 500, ...) is a
  // real failure and must propagate, not be swallowed as an empty result.
  const rows = await Promise.all(
    registrations.map(async (registration): Promise<LabSampleRow | null> => {
      let sample: LabSample
      try {
        sample = await httpClient.get<LabSample>(`/registrations/${registration.id}/lab-sample`)
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null
        throw error
      }
      const reference = buildReferenceFrom(registration, plots, farmers)
      if (!reference) return null
      return { sample, reference }
    }),
  )
  return rows.filter((row): row is LabSampleRow => row !== null)
}

export const labSamplesApiReal = {
  async listEligiblePlots(): Promise<EligiblePlotForLab[]> {
    const [registrations, { plots, farmers }] = await Promise.all([
      httpClient.get<SeasonRegistration[]>('/lab-samples/queue'),
      loadPlotsAndFarmers(),
    ])
    return registrations
      .map((r): EligiblePlotForLab | null => {
        const reference = buildReferenceFrom(r, plots, farmers)
        return reference ? { seasonRegistrationId: r.id, reference } : null
      })
      .filter((row): row is EligiblePlotForLab => row !== null)
  },

  list: () => loadAllSamples(),

  async getById(id: EntityId): Promise<LabSampleRow> {
    const all = await loadAllSamples()
    const found = all.find((row) => row.sample.id === id)
    if (!found) throw new Error('Lab sample not found.')
    return found
  },

  async getReference(seasonRegistrationId: EntityId): Promise<LabSampleReference> {
    const [registration, { plots, farmers }] = await Promise.all([
      httpClient.get<SeasonRegistration>(`/registrations/${seasonRegistrationId}`),
      loadPlotsAndFarmers(),
    ])
    const reference = buildReferenceFrom(registration, plots, farmers)
    if (!reference) throw new Error('Plot or farmer record not found for this registration.')
    return reference
  },

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
