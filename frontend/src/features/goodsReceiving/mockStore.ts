import type { GoodsReceivingRecord } from './types'

export const goodsReceivingStore: GoodsReceivingRecord[] = []

export let nextGoodsReceivingId = 1
export function allocateGoodsReceivingId() {
  return nextGoodsReceivingId++
}
