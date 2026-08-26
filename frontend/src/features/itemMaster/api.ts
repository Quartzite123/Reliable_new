import { httpClient } from '@/api/httpClient'
import type { EntityId } from '@/types/common'
import type { Material, MaterialInput, MaterialUpdateInput, Product, ProductInput, ProductUpdateInput } from './types'

export const itemMasterApiReal = {
  listMaterials: () => httpClient.get<Material[]>('/inventory/materials'),
  createMaterial: (input: MaterialInput) => httpClient.post<Material>('/inventory/materials', input),
  updateMaterial: (id: EntityId, input: MaterialUpdateInput) => httpClient.patch<Material>(`/inventory/materials/${id}`, input),

  listProducts: () => httpClient.get<Product[]>('/inventory/products'),
  createProduct: (input: ProductInput) => httpClient.post<Product>('/inventory/products', input),
  updateProduct: (id: EntityId, input: ProductUpdateInput) => httpClient.patch<Product>(`/inventory/products/${id}`, input),
}
