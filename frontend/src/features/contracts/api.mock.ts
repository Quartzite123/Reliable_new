import { ApiError } from '@/api/httpClient'
import { mockDelay } from '@/api/mockDelay'
import type { EntityId } from '@/types/common'
import { bankDetailsStore, farmersStore } from '@/features/farmers/mockStore'
import { plotsStore, seasonRegistrationsStore } from '@/features/plots/mockStore'
import { allocateContractId, contractsStore } from './mockStore'
import type { Contract, ContractPrerequisites, ContractRow, CreateContractInput, EligiblePlotForContract } from './types'

function resolveContext(seasonRegistrationId: EntityId) {
  const registration = seasonRegistrationsStore.find((r) => r.id === seasonRegistrationId)
  if (!registration) return null
  const plot = plotsStore.find((p) => p.id === registration.plotId)
  if (!plot) return null
  const farmer = farmersStore.find((f) => f.id === plot.farmerId)
  if (!farmer) return null
  return { registration, plot, farmer }
}

export const contractsApiMock = {
  /** Registrations that passed Lab and don't have a contract yet. */
  async listEligiblePlots(): Promise<EligiblePlotForContract[]> {
    await mockDelay()
    return seasonRegistrationsStore
      .filter((r) => r.status === 'Lab Passed' && !contractsStore.some((c) => c.seasonRegistrationId === r.id))
      .map((r) => {
        const context = resolveContext(r.id)
        return context
          ? { seasonRegistrationId: r.id, farmerName: context.farmer.name, plotNumber: context.plot.plotNumber, seasonYear: r.seasonYear }
          : null
      })
      .filter((row): row is EligiblePlotForContract => row !== null)
  },

  async getPrerequisites(seasonRegistrationId: EntityId): Promise<ContractPrerequisites> {
    await mockDelay(200)
    const context = resolveContext(seasonRegistrationId)
    if (!context) throw new ApiError(404, { message: 'Season registration not found.' })
    const { registration, plot, farmer } = context

    return {
      fieldQcPassed: registration.status !== 'Registered' && registration.status !== 'Field QC Failed',
      labPassed: registration.status === 'Lab Passed' || registration.status === 'Under Contract',
      bankDetailsExist: bankDetailsStore.has(farmer.id),
      farmerId: farmer.id,
      farmerName: farmer.name,
      plotNumber: plot.plotNumber,
      seasonYear: registration.seasonYear,
    }
  },

  async list(): Promise<ContractRow[]> {
    await mockDelay()
    return contractsStore
      .map((contract) => {
        const context = resolveContext(contract.seasonRegistrationId)
        if (!context) return null
        return {
          contract,
          farmerName: context.farmer.name,
          plotNumber: context.plot.plotNumber,
          seasonYear: context.registration.seasonYear,
        }
      })
      .filter((row): row is ContractRow => row !== null)
  },

  async getById(id: EntityId): Promise<ContractRow> {
    await mockDelay()
    const contract = contractsStore.find((c) => c.id === id)
    if (!contract) throw new ApiError(404, { message: 'Contract not found.' })
    const context = resolveContext(contract.seasonRegistrationId)
    if (!context) throw new ApiError(404, { message: 'Related plot/farmer record not found.' })
    return { contract, farmerName: context.farmer.name, plotNumber: context.plot.plotNumber, seasonYear: context.registration.seasonYear }
  },

  async create(input: CreateContractInput): Promise<Contract> {
    await mockDelay(500)

    const context = resolveContext(input.seasonRegistrationId)
    if (!context) throw new ApiError(404, { message: 'Season registration not found.' })
    const { registration, farmer } = context

    // Backend remains authoritative for this gate even though the UI already blocks submission (CLAUDE.md §4.7).
    if (registration.status !== 'Lab Passed') {
      throw new ApiError(409, { message: 'This record cannot continue until Lab Pass is completed.' })
    }
    if (!bankDetailsStore.has(farmer.id)) {
      throw new ApiError(409, { message: 'Bank details are required before a Contract can be created.' })
    }
    if (contractsStore.some((c) => c.seasonRegistrationId === input.seasonRegistrationId)) {
      throw new ApiError(409, { message: 'A contract already exists for this season registration.' })
    }

    const contract: Contract = {
      id: allocateContractId(),
      seasonRegistrationId: input.seasonRegistrationId,
      contractDate: input.contractDate,
      ratePerKg: String(input.ratePerKg),
      rejectionPercent: String(input.rejectionPercent ?? 7),
      terms: input.terms,
      notes: input.notes,
      createdBy: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    contractsStore.push(contract)

    registration.status = 'Under Contract'
    registration.updatedAt = new Date().toISOString()

    return contract
  },
}
