import { httpClient } from '@/api/httpClient'
import type { EntityId } from '@/types/common'
import type {
  FieldQc,
  FieldQcEntryInput,
  FollowUpFieldQcInput,
  Plot,
  PlotDetail,
  PlotSummary,
  PlotVariety,
  RegisterPlotMultiVarietyInput,
  RegisterPlotMultiVarietyResult,
  SeasonRegistration,
  VarietyRegistrationResult,
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
 * via openapi.json: `GET /plots?farmer_id=`). `getDetail`/`registerMultipleVarieties`
 * are similarly reshaped: the backend has no single "plot detail" or
 * "register plot with varieties" endpoint — those are composed client-side
 * from several real endpoints (plots, plot-varieties, registrations,
 * field-qc), per prompt Section 5B.
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
    const [plot, allRegistrations, plotVarieties] = await Promise.all([
      httpClient.get<Plot>(`/plots/${plotId}`),
      httpClient.get<SeasonRegistration[]>('/registrations'),
      httpClient.get<PlotVariety[]>(`/plots/${plotId}/varieties`),
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

    return { plot, registrations, fieldQcByRegistration, plotVarieties }
  },

  /**
   * Finds the plot_variety matching `varietyName` on this plot, or creates
   * it if none exists yet. Re-registering an existing plot for a new
   * season will almost always find a match (from the prior season); a
   * brand-new plot never does. Never blindly POST — the backend 409s on a
   * duplicate (plot_id, variety_name), which would otherwise fire on every
   * single re-registration of the same variety. Used by the registration
   * flow, where a re-post is a normal, expected case, not a mistake.
   *
   * If a match already exists, its area is left as-is even if a different
   * `areaAcres` is passed this time — editing an existing variety's area
   * isn't in scope here (the Varieties management screen doesn't offer it
   * either yet).
   */
  async ensurePlotVariety(plotId: EntityId, varietyName: string, areaAcres?: number): Promise<PlotVariety> {
    const existing = await httpClient.get<PlotVariety[]>(`/plots/${plotId}/varieties`)
    const match = existing.find((v) => v.varietyName === varietyName)
    if (match) return match
    return httpClient.post<PlotVariety>(`/plots/${plotId}/varieties`, { varietyName, areaAcres })
  },

  /**
   * Adds a variety to an existing plot from the Varieties management
   * screen — unlike `ensurePlotVariety`, always POSTs, never checks for an
   * existing match first. Here a duplicate genuinely IS a mistake (the
   * worker explicitly chose "add" for a plot whose varieties are already
   * listed on screen), so the backend's 409 ("Variety '...' already
   * registered on this plot") is the right response to surface via toast,
   * not something to silently absorb.
   */
  addPlotVariety: (plotId: EntityId, varietyName: string, areaAcres?: number) =>
    httpClient.post<PlotVariety>(`/plots/${plotId}/varieties`, { varietyName, areaAcres }),

  /** Backend 409s with "Cannot remove variety with existing season registrations" if any registration references it — surfaced as-is via toast, no client-side re-check needed. */
  removePlotVariety: (plotVarietyId: EntityId) => httpClient.delete<void>(`/plot-varieties/${plotVarietyId}`),

  /**
   * Registers one existing plot_variety for a season — no Field QC
   * collected here. Used by the Varieties management screen's "Register
   * for season" action: deliberately a separate, explicit step from
   * adding the variety (per design), and deliberately doesn't duplicate
   * the Field QC form a third time — the resulting registration shows up
   * with zero Field QC records, and PlotDetailPage's own "Record Field
   * QC" action (added 2026-09-03) is already exactly the UI for that.
   */
  registerVariety: (plotId: EntityId, plotVarietyId: EntityId, seasonYear: number) =>
    httpClient.post<SeasonRegistration>(`/plots/${plotId}/register`, { seasonYear, plotVarietyId }),

  /** Register + immediately record Field QC for it — the two-call tail shared by both the single- and multi-variety registration flow. */
  async registerVarietyForSeason(
    plotId: EntityId,
    plotVarietyId: EntityId,
    seasonYear: number,
    fieldQc: FieldQcEntryInput,
  ): Promise<SeasonRegistration> {
    const registration = await plotsApiReal.registerVariety(plotId, plotVarietyId, seasonYear)
    await httpClient.post<FieldQc>(`/registrations/${registration.id}/field-qc`, {
      inspectionDate: fieldQc.inspectionDate,
      plannedSamplingDate: emptyToUndefined(fieldQc.plannedSamplingDate),
      tentativeHarvestDate: emptyToUndefined(fieldQc.tentativeHarvestDate),
      fruitColour: fieldQc.fruitColour,
      tssPercent: fieldQc.tssPercent,
      thripsPercent: fieldQc.thripsPercent,
      bhuriPercent: fieldQc.bhuriPercent,
      blackSpotPercent: fieldQc.blackSpotPercent,
      cercosporaPercent: fieldQc.cercosporaPercent,
      overallObservation: fieldQc.overallObservation,
      exportableFruitPercent: fieldQc.exportableFruitPercent,
      notes: fieldQc.notes,
      result: fieldQc.result,
    })
    return registration
  },

  /**
   * The combined Plot + Field QC screen's submit, covering both the
   * common single-variety case (`input.varieties.length === 1`) and the
   * rare multi-variety one (Business_Rules R57 — each variety is a fully
   * independent pipeline) with one function:
   *   1. POST/PATCH /plots                    (create, or the caller already has plotId)
   *   2. per variety, SEQUENTIALLY:
   *      a. POST /plots/{plot_id}/varieties    (find-or-create the plot_variety)
   *      b. POST /plots/{plot_id}/register     (season registration)
   *      c. POST /registrations/{reg_id}/field-qc
   *
   * IMPORTANT — none of this is transactional, by variety or across
   * varieties. Each variety's own 3-call chain can partially fail (see
   * registerWithFieldQc's original comment, still accurate for a single
   * variety), and one variety's chain failing does NOT stop the next
   * variety from being attempted — every variety is attempted regardless
   * of whether an earlier one succeeded or failed, so a worker registering
   * two varieties where only one has a problem doesn't lose the other.
   * The caller gets a per-variety result list and is responsible for
   * telling the worker exactly what succeeded and what didn't; this
   * function never throws for a single variety's failure, only for a
   * failure in step 1 (the plot itself), since nothing variety-specific
   * has happened yet at that point.
   *
   * Recovery for a partial failure is the same as the single-variety case
   * always had: PlotDetailPage's "Record Field QC" action (registration
   * exists, field-qc didn't) and its Varieties section (variety row
   * missing entirely, e.g. the plots/varieties POST itself failed).
   */
  async registerMultipleVarieties(input: RegisterPlotMultiVarietyInput): Promise<RegisterPlotMultiVarietyResult> {
    const plot = input.plotId
      ? await httpClient.patch<Plot>(`/plots/${input.plotId}`, {
          plotNumber: input.plotNumber,
          mhRegistrationNumber: input.mhRegistrationNumber,
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
          areaAcres: input.areaAcres,
          village: input.village,
          taluka: input.taluka,
          surveyNo: input.surveyNo,
          gpsLat: input.gpsLat,
          gpsLong: input.gpsLong,
          pruningDate: emptyToUndefined(input.pruningDate),
          approxHarvestDate: emptyToUndefined(input.approxHarvestDate),
        })

    const results: VarietyRegistrationResult[] = []
    for (const entry of input.varieties) {
      try {
        const plotVariety = await plotsApiReal.ensurePlotVariety(plot.id, entry.variety, entry.areaAcres)
        const registration = await plotsApiReal.registerVarietyForSeason(
          plot.id,
          plotVariety.id,
          input.seasonYear,
          entry,
        )
        results.push({ variety: entry.variety, success: true, registrationId: registration.id })
      } catch (error) {
        results.push({ variety: entry.variety, success: false, error })
      }
    }

    return { plot, results }
  },

  submitFollowUpFieldQc: (input: FollowUpFieldQcInput) =>
    httpClient.post<FieldQc>(`/registrations/${input.seasonRegistrationId}/field-qc`, {
      ...input,
      plannedSamplingDate: emptyToUndefined(input.plannedSamplingDate),
      tentativeHarvestDate: emptyToUndefined(input.tentativeHarvestDate),
    }),
}
