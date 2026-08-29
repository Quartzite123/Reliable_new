import { ApiError, httpClient } from '@/api/httpClient'
import type { EntityId } from '@/types/common'
import type {
  BankDetails,
  CreateFarmerInput,
  Farmer,
  FarmerSearchResult,
  SaveBankDetailsInput,
  UpdateFarmerInput,
} from './types'

export const farmersApiReal = {
  search: (query: string) => httpClient.get<FarmerSearchResult[]>(`/farmers/search?q=${encodeURIComponent(query)}`),
  list: () => httpClient.get<Farmer[]>('/farmers'),
  getById: (id: EntityId) => httpClient.get<Farmer>(`/farmers/${id}`),
  create: (input: CreateFarmerInput) => httpClient.post<Farmer>('/farmers', input),
  // Real backend route is PATCH /farmers/{id}, not PUT (verified via generated
  // openapi.json) — the prompt asked for PUT, which would 405 against the
  // actual API, so this deliberately keeps PATCH.
  update: (id: EntityId, input: UpdateFarmerInput) => httpClient.patch<Farmer>(`/farmers/${id}`, input),
  // 404 means "no bank details recorded for this farmer yet" — the normal
  // case for a newly registered farmer, not a failure. Anything else is a
  // real error and must propagate, not be swallowed as "no bank details."
  async getBankDetails(farmerId: EntityId): Promise<BankDetails | null> {
    try {
      return await httpClient.get<BankDetails>(`/farmers/${farmerId}/bank-details`)
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null
      throw error
    }
  },
  // Only PUT (upsert) exists on the backend for bank details — there is no
  // separate POST create endpoint (verified via openapi.json), so no
  // `createBankDetails` alias is added.
  //
  // The passbook photo is a separate multipart upload
  // (`POST /farmers/{id}/bank-details/photo`) — it cannot ride along in the
  // JSON body (a `File` doesn't survive JSON.stringify/toSnake), so it's
  // sent as its own request after the main record saves successfully. If
  // the photo upload fails, the caller must know the details themselves
  // *did* save — a generic "could not be saved" here would be actively
  // wrong and make the worker think nothing happened.
  async saveBankDetails(farmerId: EntityId, input: SaveBankDetailsInput): Promise<BankDetails> {
    const { passbookPhoto, ...rest } = input
    let bankDetails = await httpClient.put<BankDetails>(`/farmers/${farmerId}/bank-details`, rest)
    if (passbookPhoto) {
      const formData = new FormData()
      formData.append('file', passbookPhoto)
      try {
        bankDetails = await httpClient.post<BankDetails>(`/farmers/${farmerId}/bank-details/photo`, formData)
      } catch (error) {
        console.error(error)
        throw new Error(
          'Bank details were saved, but the passbook photo failed to upload. Please try uploading it again.',
        )
      }
    }
    return bankDetails
  },
}
