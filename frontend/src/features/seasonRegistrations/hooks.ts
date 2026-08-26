import { useQuery } from '@tanstack/react-query'
import { seasonRegistrationsApi } from './index'

export function useSeasonRegistrations() {
  return useQuery({ queryKey: ['season-registrations'], queryFn: seasonRegistrationsApi.list })
}
