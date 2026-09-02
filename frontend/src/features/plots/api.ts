import { httpClient } from '@/api/httpClient'
import type { EntityId } from '@/types/common'
import type {
  FieldQc,
  FollowUpFieldQcInput,
  Plot,
  PlotDetail,
  PlotSummary,
  PlotVariety,
  RegisterPlotWithFieldQcInput,
  SeasonRegistration,
} from './types'

/**
 * Optional date fields (`DatePicker` inputs left blank) come out of the form
 * as `''`, not `undefined` — but the backend's `date | None` fields reject
 * `''` with a 422 (empty string isn't a valid ISO date). Strip it here so
 * "not filled in" reaches the API as "omitted", not as a malformed date.
 */
function emptyToUndefined(value: string | undefined): string | undefined {
  return value === '' ? undefined : value
}

/**
 * There is no `/farmers/{id}/plots` route on the real backend — plots are
 * filtered via a query param on the plain list endpoint instead (verified
 * via openapi.json: `GET /plots?farmer_id=`). `getDetail`/`registerWithFieldQc`
 * are similarly reshaped: the backend has no single "plot detail" or
 * "register with field QC" endpoint — those are composed client-side from
 * three real endpoints (plots, registrations, field-qc), per prompt Section 5B.
 *
 * `getDetail` fetches each registration's field-QC history in parallel via
 * `Promise.all` rather than awaiting one GET per registration in a for-loop —
 * never reintroduce a serial per-registration loop here.
 */
export const plotsApiReal = {
  async listByFarmer(farmerId: EntityId): Promise<PlotSummary[]> {
    const plots = await httpClient.get<Plot[]>(`/plots?farmer_id=${farmerId}`)
    const registrations = await httpClient.get<SeasonRegistration[]>('/registrations')
    return plots.map((plot) => ({
      plot,
      latestRegistration:
        registrations
          .filter((r) => r.plotId === plot.id)
          .sort((a, b) => b.seasonYear - a.seasonYear)[0] ?? null,
    }))
  },

  async list(): Promise<PlotSummary[]> {
    const plots = await httpClient.get<Plot[]>('/plots')
    const registrations = await httpClient.get<SeasonRegistration[]>('/registrations')
    return plots.map((plot) => ({
      plot,
      latestRegistration:
        registrations
          .filter((r) => r.plotId === plot.id)
          .sort((a, b) => b.seasonYear - a.seasonYear)[0] ?? null,
    }))
  },

  async getDetail(plotId: EntityId): Promise<PlotDetail> {
    const [plot, allRegistrations] = await Promise.all([
      httpClient.get<Plot>(`/plots/${plotId}`),
      httpClient.get<SeasonRegistration[]>('/registrations'),
    ])
    const registrations = allRegistrations
      .filter((r) => r.plotId === plotId)
      .sort((a, b) => b.seasonYear - a.seasonYear)

    const entries = await Promise.all(
      registrations.map(async (reg): Promise<readonly [EntityId, FieldQc[]]> => [
        reg.id,
        await httpClient.get<FieldQc[]>(`/registrations/${reg.id}/field-qc`),
      ]),
    )
    const fieldQcByRegistration: PlotDetail['fieldQcByRegistration'] = Object.fromEntries(entries)

    return { plot, registrations, fieldQcByRegistration }
  },

  /**
   * Finds the plot_variety matching `varietyName` on this plot, or creates
   * it if none exists yet. Re-registering an existing plot for a new
   * season will almost always find a match (from the prior season); a
   * brand-new plot never does. Never blindly POST — the backend 409s on a
   * duplicate (plot_id, variety_name), which would otherwise fire on every
   * single re-registration of the same variety.
   */
  async ensurePlotVariety(plotId: EntityId, varietyName: string): Promise<PlotVariety> {
    const existing = await httpClient.get<PlotVariety[]>(`/plots/${plotId}/varieties`)
    const match = existing.find((v) => v.varietyName === varietyName)
    if (match) return match
    return httpClient.post<PlotVariety>(`/plots/${plotId}/varieties`, { varietyName })
  },

  /**
   * Four sequential real calls, composed into the one action the combined
   * Plot + Field QC screen submits (prompt Section 5B):
   *   1. POST /plots                          (create or the caller already has plotId)
   *   2. POST /plots/{plot_id}/varieties       (find-or-create the plot_variety — added 2026-09-03)
   *   3. POST /plots/{plot_id}/register        (season registration, now requires plotVarietyId)
   *   4. POST /registrations/{reg_id}/field-qc (the inspection itself)
   *
   * Still single-variety only — `input.variety` is the one dropdown value
   * on today's form. Registering more than one variety on a plot in one
   * visit is Pass 2 (a repeatable variety+area+field-QC section); this
   * only restores the plumbing this call needed to keep working once
   * season_registrations.plot_variety_id became required.
   */
  async registerWithFieldQc(
    input: RegisterPlotWithFieldQcInput,
  ): Promise<{ plot: Plot; registrationId: EntityId }> {
    const plot = input.plotId
      ? await httpClient.patch<Plot>(`/plots/${input.plotId}`, {
          plotNumber: input.plotNumber,
          mhRegistrationNumber: input.mhRegistrationNumber,
          variety: input.variety,
          areaAcres: input.areaAcres,
          village: input.village,
          taluka: input.taluka,
          surveyNo: input.surveyNo,
          gpsLat: input.gpsLat,
          gpsLong: input.gpsLong,
          pruningDate: emptyToUndefined(input.pruningDate),
          approxHarvestDate: emptyToUndefined(input.approxHarvestDate),
        })
      : await httpClient.post<Plot>('/plots', {
          farmerId: input.farmerId,
          plotNumber: input.plotNumber,
          mhRegistrationNumber: input.mhRegistrationNumber,
          variety: input.variety,
          areaAcres: input.areaAcres,
          village: input.village,
          taluka: input.taluka,
          surveyNo: input.surveyNo,
          gpsLat: input.gpsLat,
          gpsLong: input.gpsLong,
          pruningDate: emptyToUndefined(input.pruningDate),
          approxHarvestDate: emptyToUndefined(input.approxHarvestDate),
        })

    if (!input.variety) {
      throw new Error('A variety is required to register a plot.')
    }
    const plotVariety = await plotsApiReal.ensurePlotVariety(plot.id, input.variety)

    const registration = await httpClient.post<SeasonRegistration>(`/plots/${plot.id}/register`, {
      seasonYear: input.seasonYear,
      plotVarietyId: plotVariety.id,
    })

    await httpClient.post<FieldQc>(`/registrations/${registration.id}/field-qc`, {
      inspectionDate: input.inspectionDate,
      plannedSamplingDate: emptyToUndefined(input.plannedSamplingDate),
      tentativeHarvestDate: emptyToUndefined(input.tentativeHarvestDate),
      fruitColour: input.fruitColour,
      tssPercent: input.tssPercent,
      thripsPercent: input.thripsPercent,
      bhuriPercent: input.bhuriPercent,
      blackSpotPercent: input.blackSpotPercent,
      cercosporaPercent: input.cercosporaPercent,
      overallObservation: input.overallObservation,
      exportableFruitPercent: input.exportableFruitPercent,
      notes: input.notes,
      result: input.result,
    })

    return { plot, registrationId: registration.id }
  },

  submitFollowUpFieldQc: (input: FollowUpFieldQcInput) =>
    httpClient.post<FieldQc>(`/registrations/${input.seasonRegistrationId}/field-qc`, {
      ...input,
      plannedSamplingDate: emptyToUndefined(input.plannedSamplingDate),
      tentativeHarvestDate: emptyToUndefined(input.tentativeHarvestDate),
    }),
}
