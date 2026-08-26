import { httpClient } from '@/api/httpClient'
import type { EntityId } from '@/types/common'
import type {
  FieldQc,
  FollowUpFieldQcInput,
  Plot,
  PlotDetail,
  PlotSummary,
  RegisterPlotWithFieldQcInput,
  SeasonRegistration,
} from './types'

/**
 * There is no `/farmers/{id}/plots` route on the real backend — plots are
 * filtered via a query param on the plain list endpoint instead (verified
 * via openapi.json: `GET /plots?farmer_id=`). `getDetail`/`registerWithFieldQc`
 * are similarly reshaped: the backend has no single "plot detail" or
 * "register with field QC" endpoint — those are composed client-side from
 * three real endpoints (plots, registrations, field-qc), per prompt Section 5B.
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

    const fieldQcByRegistration: PlotDetail['fieldQcByRegistration'] = {}
    for (const reg of registrations) {
      fieldQcByRegistration[reg.id] = await httpClient.get<FieldQc[]>(`/registrations/${reg.id}/field-qc`)
    }

    return { plot, registrations, fieldQcByRegistration }
  },

  /**
   * Three sequential real calls, composed into the one action the combined
   * Plot + Field QC screen submits (prompt Section 5B):
   *   1. POST /plots                          (create or the caller already has plotId)
   *   2. POST /plots/{plot_id}/register        (season registration)
   *   3. POST /registrations/{reg_id}/field-qc (the inspection itself)
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
          pruningDate: input.pruningDate,
          approxHarvestDate: input.approxHarvestDate,
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
          pruningDate: input.pruningDate,
          approxHarvestDate: input.approxHarvestDate,
        })

    const registration = await httpClient.post<SeasonRegistration>(`/plots/${plot.id}/register`, {
      seasonYear: input.seasonYear,
    })

    await httpClient.post<FieldQc>(`/registrations/${registration.id}/field-qc`, {
      inspectionDate: input.inspectionDate,
      plannedSamplingDate: input.plannedSamplingDate,
      tentativeHarvestDate: input.tentativeHarvestDate,
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
    httpClient.post<FieldQc>(`/registrations/${input.seasonRegistrationId}/field-qc`, input),
}
