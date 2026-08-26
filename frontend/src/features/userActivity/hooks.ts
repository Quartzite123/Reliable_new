import { useQuery } from '@tanstack/react-query'
import { userActivityApi } from './index'

export function useUserActivity() {
  return useQuery({ queryKey: ['user-activity'], queryFn: userActivityApi.list })
}
