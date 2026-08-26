import { ApiError } from '@/api/httpClient'
import { mockDelay } from '@/api/mockDelay'
import { farmersStore } from '@/features/farmers/mockStore'
import { plotsStore, seasonRegistrationsStore } from '@/features/plots/mockStore'
import type { EntityId } from '@/types/common'
import { allocateLabSampleId, labSamplesStore } from './mockStore'
import type { CreateLabSampleInput, EligiblePlotForLab, LabSample, LabSampleReference, LabSampleRow } from './types'

function buildReference(seasonRegistrationId: EntityId): LabSampleReference | null {
  const registration = seasonRegistrationsStore.find((r) => r.id === seasonRegistrationId)
  if (!registration) return null
  const plot = plotsStore.find((p) => p.id === registration.plotId)
  if (!plot) return null
  const farmer = farmersStore.find((f) => f.id === plot.farmerId)
  if (!farmer) return null

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

export const labSamplesApiMock = {
  /** Registrations that passed Field QC and don't have a lab sample yet — Business_Rules R18. */
  async listEligiblePlots(): Promise<EligiblePlotForLab[]> {
    await mockDelay()
    return seasonRegistrationsStore
      .filter((r) => r.status === 'Field QC Passed' && !labSamplesStore.some((s) => s.seasonRegistrationId === r.id))
      .map((r) => {
        const reference = buildReference(r.id)
        return reference ? { seasonRegistrationId: r.id, reference } : null
      })
      .filter((row): row is EligiblePlotForLab => row !== null)
  },

  async list(): Promise<LabSampleRow[]> {
    await mockDelay()
    return labSamplesStore
      .map((sample) => {
        const reference = buildReference(sample.seasonRegistrationId)
        return reference ? { sample, reference } : null
      })
      .filter((row): row is LabSampleRow => row !== null)
  },

  async getById(id: EntityId): Promise<LabSampleRow> {
    await mockDelay()
    const sample = labSamplesStore.find((s) => s.id === id)
    if (!sample) throw new ApiError(404, { message: 'Lab sample not found.' })
    const reference = buildReference(sample.seasonRegistrationId)
    if (!reference) throw new ApiError(404, { message: 'Related plot/farmer record not found.' })
    return { sample, reference }
  },

  async getReference(seasonRegistrationId: EntityId): Promise<LabSampleReference> {
    await mockDelay(200)
    const reference = buildReference(seasonRegistrationId)
    if (!reference) throw new ApiError(404, { message: 'Season registration not found.' })
    return reference
  },

  async create(input: CreateLabSampleInput): Promise<LabSample> {
    await mockDelay(500)

    const registration = seasonRegistrationsStore.find((r) => r.id === input.seasonRegistrationId)
    if (!registration) throw new ApiError(404, { message: 'Season registration not found.' })
    if (registration.status !== 'Field QC Passed') {
      throw new ApiError(409, { message: 'This plot cannot continue until Field QC has passed.' })
    }
    if (labSamplesStore.some((s) => s.seasonRegistrationId === input.seasonRegistrationId)) {
      throw new ApiError(409, { message: 'A lab sample already exists for this season registration.' })
    }

    const sample: LabSample = {
      id: allocateLabSampleId(),
      seasonRegistrationId: input.seasonRegistrationId,
      labName: input.labName,
      samplingDate: input.samplingDate,
      sealNo: input.sealNo,
      varietyConfirmed: input.varietyConfirmed,
      areaHa2a: String(input.areaHa2a),
      yield4bMt: String(input.yield4bMt),
      sealPhotoUrl: input.sealPhoto ? URL.createObjectURL(input.sealPhoto) : undefined,
      documents2a4bUrl: input.documents2a4b ? URL.createObjectURL(input.documents2a4b) : undefined,
      remark: input.remark,
      tssValue: String(input.tssValue),
      result: input.result,
      enteredBy: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    labSamplesStore.push(sample)

    registration.status = input.result === 'Pass' ? 'Lab Passed' : 'Lab Failed'
    registration.updatedAt = new Date().toISOString()

    return sample
  },
}
