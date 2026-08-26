import { useQuery } from '@tanstack/react-query'
import { customersApi } from './index'

export function useCustomers() {
  return useQuery({ queryKey: ['customers'], queryFn: customersApi.list, staleTime: 5 * 60_000 })
}
