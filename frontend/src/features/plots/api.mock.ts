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
  FieldQcEntryInput,
  FollowUpFieldQcInput,
  Plot,
  PlotDetail,
  PlotSummary,
  PlotVariety,
  RegisterPlotMultiVarietyInput,
  SeasonRegistration,
  VarietyRegistrationResult,
} from './types'

/** Mock plot_varieties store — module-local, mirrors the real table's shape closely enough for the mock UI path. */
const plotVarietiesStore: PlotVariety[] = []
let nextPlotVarietyId = 1
function allocatePlotVarietyId(): EntityId {
  return nextPlotVarietyId++
}

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

    const plotVarieties = plotVarietiesStore.filter((v) => v.plotId === plotId)

    return { plot, registrations, fieldQcByRegistration, plotVarieties }
  },

  async ensurePlotVariety(plotId: EntityId, varietyName: string, areaAcres?: number): Promise<PlotVariety> {
    await mockDelay(150)
    const existing = plotVarietiesStore.find((v) => v.plotId === plotId && v.varietyName === varietyName)
    if (existing) return existing
    const created: PlotVariety = {
      id: allocatePlotVarietyId(),
      plotId,
      varietyName,
      areaAcres: areaAcres !== undefined ? String(areaAcres) : undefined,
      createdAt: new Date().toISOString(),
    }
    plotVarietiesStore.push(created)
    return created
  },

  async addPlotVariety(plotId: EntityId, varietyName: string, areaAcres?: number): Promise<PlotVariety> {
    await mockDelay(300)
    if (plotVarietiesStore.some((v) => v.plotId === plotId && v.varietyName === varietyName)) {
      throw new ApiError(409, { message: `Variety '${varietyName}' already registered on this plot` })
    }
    const created: PlotVariety = {
      id: allocatePlotVarietyId(),
      plotId,
      varietyName,
      areaAcres: areaAcres !== undefined ? String(areaAcres) : undefined,
      createdAt: new Date().toISOString(),
    }
    plotVarietiesStore.push(created)
    return created
  },

  async removePlotVariety(plotVarietyId: EntityId): Promise<void> {
    await mockDelay(300)
    const index = plotVarietiesStore.findIndex((v) => v.id === plotVarietyId)
    if (index === -1) throw new ApiError(404, { message: 'Plot variety not found' })
    if (seasonRegistrationsStore.some((r) => r.plotVarietyId === plotVarietyId)) {
      throw new ApiError(409, { message: 'Cannot remove variety with existing season registrations' })
    }
    plotVarietiesStore.splice(index, 1)
  },

  async registerVariety(plotId: EntityId, plotVarietyId: EntityId, seasonYear: number): Promise<SeasonRegistration> {
    await mockDelay(300)
    const plotVariety = plotVarietiesStore.find((v) => v.id === plotVarietyId)
    if (seasonRegistrationsStore.some((r) => r.plotVarietyId === plotVarietyId && r.seasonYear === seasonYear)) {
      throw new ApiError(409, { message: 'This plot is already registered for that season.' })
    }
    const registration: SeasonRegistration = {
      id: allocateRegistrationId(),
      plotId,
      plotVarietyId,
      varietyName: plotVariety?.varietyName,
      seasonYear,
      status: 'Registered',
      registeredBy: 2,
      registeredAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    seasonRegistrationsStore.push(registration)
    return registration
  },

  async registerVarietyForSeason(
    plotId: EntityId,
    plotVarietyId: EntityId,
    seasonYear: number,
    fieldQc: FieldQcEntryInput,
  ): Promise<SeasonRegistration> {
    const registration = await plotsApiMock.registerVariety(plotId, plotVarietyId, seasonYear)
    await mockDelay(300)
    fieldQcStore.push({
      id: allocateFieldQcId(),
      seasonRegistrationId: registration.id,
      inspectionDate: fieldQc.inspectionDate,
      plannedSamplingDate: fieldQc.plannedSamplingDate,
      tentativeHarvestDate: fieldQc.tentativeHarvestDate,
      fruitColour: fieldQc.fruitColour,
      tssPercent: fieldQc.tssPercent !== undefined ? String(fieldQc.tssPercent) : undefined,
      thripsPercent: fieldQc.thripsPercent !== undefined ? String(fieldQc.thripsPercent) : undefined,
      bhuriPercent: fieldQc.bhuriPercent !== undefined ? String(fieldQc.bhuriPercent) : undefined,
      blackSpotPercent: fieldQc.blackSpotPercent !== undefined ? String(fieldQc.blackSpotPercent) : undefined,
      cercosporaPercent: fieldQc.cercosporaPercent !== undefined ? String(fieldQc.cercosporaPercent) : undefined,
      overallObservation: fieldQc.overallObservation,
      exportableFruitPercent: fieldQc.exportableFruitPercent !== undefined ? String(fieldQc.exportableFruitPercent) : undefined,
      notes: fieldQc.notes,
      result: fieldQc.result,
      inspectedBy: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    registration.status = fieldQc.result === 'Pass' ? 'Field QC Passed' : 'Field QC Failed'
    registration.updatedAt = new Date().toISOString()
    return registration
  },

  /** One combined submit for Plot + (one or more) Season Registration + Field QC (Business_Rules R15a, R57). */
  async registerMultipleVarieties(input: RegisterPlotMultiVarietyInput): Promise<{ plot: Plot; results: VarietyRegistrationResult[] }> {
    await mockDelay(500)

    let plot = input.plotId ? plotsStore.find((p) => p.id === input.plotId) : undefined

    if (plot) {
      Object.assign(plot, {
        plotNumber: input.plotNumber,
        mhRegistrationNumber: input.mhRegistrationNumber,
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

    const results: VarietyRegistrationResult[] = []
    for (const entry of input.varieties) {
      try {
        const plotVariety = await plotsApiMock.ensurePlotVariety(plot.id, entry.variety, entry.areaAcres)
        const registration = await plotsApiMock.registerVarietyForSeason(plot.id, plotVariety.id, input.seasonYear, entry)
        results.push({ variety: entry.variety, success: true, registrationId: registration.id })
      } catch (error) {
        results.push({ variety: entry.variety, success: false, error })
      }
    }

    return { plot, results }
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
