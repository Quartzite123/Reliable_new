import { httpClient } from '@/api/httpClient'
import type { UserActivityRow } from './types'

export const userActivityApiReal = {
  list: () => httpClient.get<UserActivityRow[]>('/user-activity'),
}
