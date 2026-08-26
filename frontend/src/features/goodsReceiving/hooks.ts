import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { goodsReceivingApi } from './index'
import type { GoodsReceivingInput } from './types'

export const goodsReceivingQueryKeys = {
  eligible: ['goods-receiving', 'eligible'] as const,
  all: ['goods-receiving'] as const,
}

export function useEligibleTripsForGoodsReceiving() {
  return useQuery({ queryKey: goodsReceivingQueryKeys.eligible, queryFn: goodsReceivingApi.listEligibleTrips })
}

export function useGoodsReceivingRecords() {
  return useQuery({ queryKey: goodsReceivingQueryKeys.all, queryFn: goodsReceivingApi.list })
}

export function useCreateGoodsReceiving() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: GoodsReceivingInput) => goodsReceivingApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goodsReceivingQueryKeys.eligible })
      queryClient.invalidateQueries({ queryKey: goodsReceivingQueryKeys.all })
    },
  })
}
