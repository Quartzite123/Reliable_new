import { ApiError } from '@/api/httpClient'
import { mockDelay } from '@/api/mockDelay'
import type { EntityId } from '@/types/common'
import {
  allocateFieldQcId,
  allocatePlotId,
  allocateRegistrationId,
  fieldQcStore,
  plotsStore,
  seasonRegistrationsStore,
} from './mockStore'
import type {
  FieldQc,
  FollowUpFieldQcInput,
  Plot,
  PlotDetail,
  PlotSummary,
  RegisterPlotWithFieldQcInput,
} from './types'

function latestRegistrationForPlot(plotId: EntityId) {
  const regs = seasonRegistrationsStore.filter((r) => r.plotId === plotId)
  return regs.sort((a, b) => b.seasonYear - a.seasonYear)[0] ?? null
}

export const plotsApiMock = {
  async listByFarmer(farmerId: EntityId): Promise<PlotSummary[]> {
    await mockDelay()
    return plotsStore
      .filter((p) => p.farmerId === farmerId)
      .map((plot) => ({ plot, latestRegistration: latestRegistrationForPlot(plot.id) }))
  },

  async list(): Promise<PlotSummary[]> {
    await mockDelay()
    return plotsStore.map((plot) => ({ plot, latestRegistration: latestRegistrationForPlot(plot.id) }))
  },

  async getDetail(plotId: EntityId): Promise<PlotDetail> {
    await mockDelay()
    const plot = plotsStore.find((p) => p.id === plotId)
    if (!plot) throw new ApiError(404, { message: 'Plot not found.' })

    const registrations = seasonRegistrationsStore
      .filter((r) => r.plotId === plotId)
      .sort((a, b) => b.seasonYear - a.seasonYear)

    const fieldQcByRegistration: PlotDetail['fieldQcByRegistration'] = {}
    for (const reg of registrations) {
      fieldQcByRegistration[reg.id] = fieldQcStore
        .filter((qc) => qc.seasonRegistrationId === reg.id)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    }

    return { plot, registrations, fieldQcByRegistration }
  },

  /** One combined submit for Plot + Season Registration + Field QC (Business_Rules R15a). */
  async registerWithFieldQc(input: RegisterPlotWithFieldQcInput): Promise<{ plot: Plot; registrationId: EntityId }> {
    await mockDelay(500)

    let plot = input.plotId ? plotsStore.find((p) => p.id === input.plotId) : undefined

    if (plot) {
      Object.assign(plot, {
        plotNumber: input.plotNumber,
        mhRegistrationNumber: input.mhRegistrationNumber,
        variety: input.variety,
        areaAcres: input.areaAcres !== undefined ? String(input.areaAcres) : undefined,
        village: input.village,
        taluka: input.taluka,
        surveyNo: input.surveyNo,
        gpsLat: input.gpsLat !== undefined ? String(input.gpsLat) : undefined,
        gpsLong: input.gpsLong !== undefined ? String(input.gpsLong) : undefined,
        pruningDate: input.pruningDate,
        approxHarvestDate: input.approxHarvestDate,
        updatedAt: new Date().toISOString(),
      })
    } else {
      if (
        plotsStore.some(
          (p) => p.farmerId === input.farmerId && p.plotNumber.toLowerCase() === input.plotNumber.toLowerCase(),
        )
      ) {
        throw new ApiError(409, {
          message: 'This plot number is already used for this farmer.',
          fieldErrors: { plotNumber: 'Plot numbers must be unique per farmer.' },
        })
      }
      plot = {
        id: allocatePlotId(),
        farmerId: input.farmerId,
        plotNumber: input.plotNumber,
        mhRegistrationNumber: input.mhRegistrationNumber,
        variety: input.variety,
        areaAcres: input.areaAcres !== undefined ? String(input.areaAcres) : undefined,
        village: input.village,
        taluka: input.taluka,
        surveyNo: input.surveyNo,
        gpsLat: input.gpsLat !== undefined ? String(input.gpsLat) : undefined,
        gpsLong: input.gpsLong !== undefined ? String(input.gpsLong) : undefined,
        pruningDate: input.pruningDate,
        approxHarvestDate: input.approxHarvestDate,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      plotsStore.push(plot)
    }

    if (seasonRegistrationsStore.some((r) => r.plotId === plot!.id && r.seasonYear === input.seasonYear)) {
      throw new ApiError(409, {
        message: 'This plot is already registered for this season.',
        fieldErrors: { seasonYear: 'A registration already exists for this plot and season.' },
      })
    }

    const registration = {
      id: allocateRegistrationId(),
      plotId: plot.id,
      seasonYear: input.seasonYear,
      status: input.result === 'Pass' ? ('Field QC Passed' as const) : ('Field QC Failed' as const),
      registeredBy: 2,
      registeredAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    seasonRegistrationsStore.push(registration)

    fieldQcStore.push({
      id: allocateFieldQcId(),
      seasonRegistrationId: registration.id,
      inspectionDate: input.inspectionDate,
      plannedSamplingDate: input.plannedSamplingDate,
      tentativeHarvestDate: input.tentativeHarvestDate,
      fruitColour: input.fruitColour,
      tssPercent: input.tssPercent !== undefined ? String(input.tssPercent) : undefined,
      thripsPercent: input.thripsPercent !== undefined ? String(input.thripsPercent) : undefined,
      bhuriPercent: input.bhuriPercent !== undefined ? String(input.bhuriPercent) : undefined,
      blackSpotPercent: input.blackSpotPercent !== undefined ? String(input.blackSpotPercent) : undefined,
      cercosporaPercent: input.cercosporaPercent !== undefined ? String(input.cercosporaPercent) : undefined,
      overallObservation: input.overallObservation,
      exportableFruitPercent: input.exportableFruitPercent !== undefined ? String(input.exportableFruitPercent) : undefined,
      notes: input.notes,
      result: input.result,
      inspectedBy: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    return { plot, registrationId: registration.id }
  },

  /** Follow-up inspection after a Field QC failure — old record kept, status resets on pass (Business_Rules R17). */
  async submitFollowUpFieldQc(input: FollowUpFieldQcInput): Promise<FieldQc> {
    await mockDelay(400)

    const registration = seasonRegistrationsStore.find((r) => r.id === input.seasonRegistrationId)
    if (!registration) throw new ApiError(404, { message: 'Season registration not found.' })

    const fieldQc: FieldQc = {
      id: allocateFieldQcId(),
      seasonRegistrationId: registration.id,
      inspectionDate: input.inspectionDate,
      plannedSamplingDate: input.plannedSamplingDate,
      tentativeHarvestDate: input.tentativeHarvestDate,
      fruitColour: input.fruitColour,
      tssPercent: input.tssPercent !== undefined ? String(input.tssPercent) : undefined,
      thripsPercent: input.thripsPercent !== undefined ? String(input.thripsPercent) : undefined,
      bhuriPercent: input.bhuriPercent !== undefined ? String(input.bhuriPercent) : undefined,
      blackSpotPercent: input.blackSpotPercent !== undefined ? String(input.blackSpotPercent) : undefined,
      cercosporaPercent: input.cercosporaPercent !== undefined ? String(input.cercosporaPercent) : undefined,
      overallObservation: input.overallObservation,
      exportableFruitPercent: input.exportableFruitPercent !== undefined ? String(input.exportableFruitPercent) : undefined,
      notes: input.notes,
      result: input.result,
      inspectedBy: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    fieldQcStore.push(fieldQc)

    registration.status = input.result === 'Pass' ? 'Field QC Passed' : 'Field QC Failed'
    registration.updatedAt = new Date().toISOString()

    return fieldQc
  },
}
