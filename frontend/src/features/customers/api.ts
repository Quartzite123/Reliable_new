import { httpClient } from '@/api/httpClient'
import type { Customer } from './types'

export const customersApiReal = {
  list: () => httpClient.get<Customer[]>('/customers'),
}
