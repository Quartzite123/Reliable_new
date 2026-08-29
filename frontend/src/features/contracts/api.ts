import { ApiError, httpClient } from '@/api/httpClient'
import type { EntityId } from '@/types/common'
import type { Farmer } from '@/features/farmers'
import type { Plot, SeasonRegistration } from '@/features/plots'
import type { Contract, ContractPrerequisites, ContractRow, CreateContractInput, EligiblePlotForContract } from './types'

/**
 * None of `/contracts/eligible-plots`, `/season-registrations/{id}/contract-prerequisites`,
 * or `GET /contracts/{id}` exist on the real backend (verified via
 * openapi.json — the only contract routes are `GET /contracts`,
 * `POST /registrations/{reg_id}/contract`, `GET /registrations/{reg_id}/contract`).
 * Everything below is composed client-side from `/registrations`, `/plots`,
 * `/farmers`, and bank-details lookups.
 */
async function loadContext(seasonRegistrationId: EntityId) {
  const registration = await httpClient.get<SeasonRegistration>(`/registrations/${seasonRegistrationId}`)
  const plot = await httpClient.get<Plot>(`/plots/${registration.plotId}`)
  const farmer = await httpClient.get<Farmer>(`/farmers/${plot.farmerId}`)
  return { registration, plot, farmer }
}

export const contractsApiReal = {
  async listEligiblePlots(): Promise<EligiblePlotForContract[]> {
    const [registrations, contracts] = await Promise.all([
      httpClient.get<SeasonRegistration[]>('/registrations'),
      httpClient.get<Contract[]>('/contracts'),
    ])
    const contracted = new Set(contracts.map((c) => c.seasonRegistrationId))
    const eligible = registrations.filter((r) => r.status === 'Lab Passed' && !contracted.has(r.id))

    const rows: EligiblePlotForContract[] = []
    for (const r of eligible) {
      const { plot, farmer } = await loadContext(r.id)
      rows.push({ seasonRegistrationId: r.id, farmerName: farmer.name, plotNumber: plot.plotNumber, seasonYear: r.seasonYear })
    }
    return rows
  },

  async getPrerequisites(seasonRegistrationId: EntityId): Promise<ContractPrerequisites> {
    const { registration, plot, farmer } = await loadContext(seasonRegistrationId)
    // 404 = no bank details recorded yet (the common case this check exists
    // to catch) — not a failure. Anything else must propagate as a real
    // error, not be misread as "bank details missing."
    let bankDetailsExist: boolean
    try {
      await httpClient.get(`/farmers/${farmer.id}/bank-details`)
      bankDetailsExist = true
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 404)) throw error
      bankDetailsExist = false
    }
    return {
      fieldQcPassed: registration.status !== 'Registered' && registration.status !== 'Field QC Failed',
      labPassed: registration.status === 'Lab Passed' || registration.status === 'Under Contract',
      bankDetailsExist,
      farmerId: farmer.id,
      farmerName: farmer.name,
      plotNumber: plot.plotNumber,
      seasonYear: registration.seasonYear,
    }
  },

  async list(): Promise<ContractRow[]> {
    const contracts = await httpClient.get<Contract[]>('/contracts')
    const rows: ContractRow[] = []
    for (const contract of contracts) {
      const { plot, farmer, registration } = await loadContext(contract.seasonRegistrationId)
      rows.push({ contract, farmerName: farmer.name, plotNumber: plot.plotNumber, seasonYear: registration.seasonYear })
    }
    return rows
  },

  async getById(id: EntityId): Promise<ContractRow> {
    const contracts = await httpClient.get<Contract[]>('/contracts')
    const contract = contracts.find((c) => c.id === id)
    if (!contract) throw new Error('Contract not found.')
    const { plot, farmer, registration } = await loadContext(contract.seasonRegistrationId)
    return { contract, farmerName: farmer.name, plotNumber: plot.plotNumber, seasonYear: registration.seasonYear }
  },

  create: (input: CreateContractInput) =>
    httpClient.post<Contract>(`/registrations/${input.seasonRegistrationId}/contract`, {
      contractDate: input.contractDate,
      ratePerKg: input.ratePerKg,
      rejectionPercent: input.rejectionPercent,
    }),
}
