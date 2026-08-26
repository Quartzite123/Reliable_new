import { httpClient } from '@/api/httpClient'
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
  getBankDetails: (farmerId: EntityId) => httpClient.get<BankDetails | null>(`/farmers/${farmerId}/bank-details`),
  // Only PUT (upsert) exists on the backend for bank details — there is no
  // separate POST create endpoint (verified via openapi.json), so no
  // `createBankDetails` alias is added.
  saveBankDetails: (farmerId: EntityId, input: SaveBankDetailsInput) =>
    httpClient.put<BankDetails>(`/farmers/${farmerId}/bank-details`, input),
}
