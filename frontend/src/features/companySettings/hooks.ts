import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { companySettingsApi } from './index'
import type { UpdateCompanySettingsInput } from './types'

const KEY = ['company-settings'] as const

export function useCompanySettings() {
  return useQuery({ queryKey: KEY, queryFn: companySettingsApi.get, staleTime: 5 * 60_000 })
}

export function useUpdateCompanySettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateCompanySettingsInput) => companySettingsApi.update(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}
