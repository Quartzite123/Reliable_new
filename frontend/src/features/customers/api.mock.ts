import { mockDelay } from '@/api/mockDelay'
import { customersStore } from './mockStore'
import type { Customer } from './types'

export const customersApiMock = {
  async list(): Promise<Customer[]> {
    await mockDelay(150)
    return customersStore.filter((c) => c.isActive)
  },
}
