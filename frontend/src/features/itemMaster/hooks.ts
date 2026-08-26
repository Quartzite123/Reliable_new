import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { EntityId } from '@/types/common'
import { itemMasterApi } from './index'
import type { MaterialInput, MaterialUpdateInput, ProductInput, ProductUpdateInput } from './types'

const MATERIALS_KEY = ['item-master', 'materials'] as const
const PRODUCTS_KEY = ['item-master', 'products'] as const

export function useMaterials() {
  return useQuery({ queryKey: MATERIALS_KEY, queryFn: itemMasterApi.listMaterials })
}

export function useProducts() {
  return useQuery({ queryKey: PRODUCTS_KEY, queryFn: itemMasterApi.listProducts })
}

export function useCreateMaterial() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: MaterialInput) => itemMasterApi.createMaterial(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MATERIALS_KEY }),
  })
}

export function useUpdateMaterial(id: EntityId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: MaterialUpdateInput) => itemMasterApi.updateMaterial(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MATERIALS_KEY }),
  })
}

export function useCreateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ProductInput) => itemMasterApi.createProduct(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY }),
  })
}

export function useUpdateProduct(id: EntityId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ProductUpdateInput) => itemMasterApi.updateProduct(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY }),
  })
}
