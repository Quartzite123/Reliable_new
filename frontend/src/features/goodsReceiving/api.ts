import { httpClient } from '@/api/httpClient'
import type { EligibleTripForGoodsReceiving, GoodsReceivingInput, GoodsReceivingRecord, GoodsReceivingRow } from './types'

export const goodsReceivingApiReal = {
  listEligibleTrips: () => httpClient.get<EligibleTripForGoodsReceiving[]>('/goods-receiving/eligible-trips'),
  list: () => httpClient.get<GoodsReceivingRow[]>('/goods-receiving'),
  create: (input: GoodsReceivingInput) => httpClient.post<GoodsReceivingRecord>('/goods-receiving', input),
}
