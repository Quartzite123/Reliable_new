import { USE_MOCK_API } from '@/api/httpClient'
import { goodsReceivingApiMock } from './api.mock'
import { goodsReceivingApiReal } from './api'

export const goodsReceivingApi = USE_MOCK_API ? goodsReceivingApiMock : goodsReceivingApiReal

export * from './types'
