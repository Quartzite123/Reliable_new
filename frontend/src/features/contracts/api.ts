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
 *
 * `listEligiblePlots` and `list` fetch `/plots` and `/farmers` once in bulk
 * and join in memory (`loadPlotsAndFarmers`/`resolveContext` below), instead
 * of awaiting a per-row `loadContext` call inside a for-loop. Never
 * reintroduce a per-row GET here — with N registrations/contracts that's
 * 2-3N serial requests instead of 2.
 */
async function loadPlotsAndFarmers(): Promise<{ plots: Plot[]; farmers: Farmer[] }> {
  const [plots, farmers] = await Promise.all([
    httpClient.get<Plot[]>('/plots'),
    httpClient.get<Farmer[]>('/farmers'),
  ])
  return { plots, farmers }
}

function resolveContext(
  registration: SeasonRegistration,
  plots: Plot[],
  farmers: Farmer[],
): { plot: Plot; farmer: Farmer } | null {
  const plot = plots.find((p) => p.id === registration.plotId)
  if (!plot) {
    console.warn(`[contracts] registration ${registration.id}: plot ${registration.plotId} not found in /plots — skipping`)
    return null
  }
  const farmer = farmers.find((f) => f.id === plot.farmerId)
  if (!farmer) {
    console.warn(`[contracts] registration ${registration.id}: farmer ${plot.farmerId} not found in /farmers — skipping`)
    return null
  }
  return { plot, farmer }
}

/**
 * Single-item lookup for `getPrerequisites`/`getById`, where the caller only
 * has an id, not the registration object — a bulk fetch would be wasted work
 * for one row. Not part of the N+1 pattern above.
 */
async function loadContext(seasonRegistrationId: EntityId) {
  const registration = await httpClient.get<SeasonRegistration>(`/registrations/${seasonRegistrationId}`)
  const plot = await httpClient.get<Plot>(`/plots/${registration.plotId}`)
  const farmer = await httpClient.get<Farmer>(`/farmers/${plot.farmerId}`)
  return { registration, plot, farmer }
}

export const contractsApiReal = {
  async listEligiblePlots(): Promise<EligiblePlotForContract[]> {
    const [registrations, contracts, { plots, farmers }] = await Promise.all([
      httpClient.get<SeasonRegistration[]>('/registrations'),
      httpClient.get<Contract[]>('/contracts'),
      loadPlotsAndFarmers(),
    ])
    const contracted = new Set(contracts.map((c) => c.seasonRegistrationId))
    const eligible = registrations.filter((r) => r.status === 'Lab Passed' && !contracted.has(r.id))

    return eligible
      .map((r): EligiblePlotForContract | null => {
        const context = resolveContext(r, plots, farmers)
        if (!context) return null
        return {
          seasonRegistrationId: r.id,
          farmerName: context.farmer.name,
          plotNumber: context.plot.plotNumber,
          variety: r.varietyName,
          seasonYear: r.seasonYear,
        }
      })
      .filter((row): row is EligiblePlotForContract => row !== null)
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
      variety: registration.varietyName,
      seasonYear: registration.seasonYear,
    }
  },

  async list(): Promise<ContractRow[]> {
    const [contracts, registrations, { plots, farmers }] = await Promise.all([
      httpClient.get<Contract[]>('/contracts'),
      httpClient.get<SeasonRegistration[]>('/registrations'),
      loadPlotsAndFarmers(),
    ])

    return contracts
      .map((contract): ContractRow | null => {
        const registration = registrations.find((r) => r.id === contract.seasonRegistrationId)
        if (!registration) {
          console.warn(`[contracts] contract ${contract.id}: registration ${contract.seasonRegistrationId} not found in /registrations — skipping`)
          return null
        }
        const context = resolveContext(registration, plots, farmers)
        if (!context) return null
        return {
          contract,
          farmerName: context.farmer.name,
          plotNumber: context.plot.plotNumber,
          variety: registration.varietyName,
          seasonYear: registration.seasonYear,
        }
      })
      .filter((row): row is ContractRow => row !== null)
  },

  async getById(id: EntityId): Promise<ContractRow> {
    const contracts = await httpClient.get<Contract[]>('/contracts')
    const contract = contracts.find((c) => c.id === id)
    if (!contract) throw new Error('Contract not found.')
    const { plot, farmer, registration } = await loadContext(contract.seasonRegistrationId)
    return {
      contract,
      farmerName: farmer.name,
      plotNumber: plot.plotNumber,
      variety: registration.varietyName,
      seasonYear: registration.seasonYear,
    }
  },

  // No rejectionPercent in the body — the backend defaults it to 7.00
  // (Contract.rejection_percent, unread by any calculation now).
  create: (input: CreateContractInput) =>
    httpClient.post<Contract>(`/registrations/${input.seasonRegistrationId}/contract`, {
      contractDate: input.contractDate,
      ratePerKg: input.ratePerKg,
    }),
}
