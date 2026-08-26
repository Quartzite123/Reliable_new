import { ApiError } from '@/api/httpClient'
import { mockDelay } from '@/api/mockDelay'
import { fuzzyScore } from '@/utils/fuzzySearch'
import type { EntityId } from '@/types/common'
import { allocateBankDetailsId, allocateFarmerId, bankDetailsStore, farmersStore } from './mockStore'
import type {
  BankDetails,
  CreateFarmerInput,
  Farmer,
  FarmerSearchResult,
  SaveBankDetailsInput,
  UpdateFarmerInput,
} from './types'

export const farmersApiMock = {
  async search(query: string): Promise<FarmerSearchResult[]> {
    await mockDelay()
    if (!query.trim()) return []

    return farmersStore
      .map((farmer) => ({
        farmer,
        matchScore: Math.max(fuzzyScore(query, farmer.name), fuzzyScore(query, farmer.mobile)),
      }))
      .filter((scored) => scored.matchScore >= 0.4)
      .sort((a, b) => b.matchScore - a.matchScore)
      .map(({ farmer }): FarmerSearchResult => ({
        id: farmer.id,
        name: farmer.name,
        mobile: farmer.mobile,
        address: farmer.address,
        status: farmer.status,
      }))
  },

  async list(): Promise<Farmer[]> {
    await mockDelay()
    return [...farmersStore]
  },

  async getById(id: EntityId): Promise<Farmer> {
    await mockDelay()
    const farmer = farmersStore.find((f) => f.id === id)
    if (!farmer) throw new ApiError(404, { message: 'Farmer not found.' })
    return farmer
  },

  async create(input: CreateFarmerInput): Promise<Farmer> {
    await mockDelay()
    const farmer: Farmer = {
      id: allocateFarmerId(),
      ...input,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    farmersStore.push(farmer)
    return farmer
  },

  async update(id: EntityId, input: UpdateFarmerInput): Promise<Farmer> {
    await mockDelay()
    const index = farmersStore.findIndex((f) => f.id === id)
    if (index === -1) throw new ApiError(404, { message: 'Farmer not found.' })
    farmersStore[index] = { ...farmersStore[index], ...input, updatedAt: new Date().toISOString() }
    return farmersStore[index]
  },

  async getBankDetails(farmerId: EntityId): Promise<BankDetails | null> {
    await mockDelay()
    return bankDetailsStore.get(farmerId) ?? null
  },

  async saveBankDetails(farmerId: EntityId, input: SaveBankDetailsInput): Promise<BankDetails> {
    await mockDelay()
    const existing = bankDetailsStore.get(farmerId)
    const record: BankDetails = {
      id: existing?.id ?? allocateBankDetailsId(),
      farmerId,
      accountHolderName: input.accountHolderName,
      bankName: input.bankName,
      accountNumber: input.accountNumber,
      ifscCode: input.ifscCode,
      branchName: input.branchName,
      passbookPhotoUrl: input.passbookPhoto ? URL.createObjectURL(input.passbookPhoto) : existing?.passbookPhotoUrl,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    bankDetailsStore.set(farmerId, record)
    return record
  },
}
