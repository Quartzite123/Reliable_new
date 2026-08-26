import { ApiError } from '@/api/httpClient'
import { mockDelay } from '@/api/mockDelay'
import { currentStockFor } from '@/features/inventory/mockStore'
import type { EntityId } from '@/types/common'
import { allocateMaterialId, allocateProductId, materialsStore, productsStore } from './mockStore'
import type { Material, MaterialInput, MaterialUpdateInput, Product, ProductInput, ProductUpdateInput } from './types'

export const itemMasterApiMock = {
  async listMaterials(): Promise<Material[]> {
    await mockDelay()
    return materialsStore.map((m) => ({ ...m, currentStock: currentStockFor(m.id) }))
  },

  async createMaterial(input: MaterialInput): Promise<Material> {
    await mockDelay(400)
    const material: Material = {
      id: allocateMaterialId(),
      ...input,
      isActive: true,
      currentStock: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    materialsStore.push(material)
    return material
  },

  async updateMaterial(id: EntityId, input: MaterialUpdateInput): Promise<Material> {
    await mockDelay(400)
    const index = materialsStore.findIndex((m) => m.id === id)
    if (index === -1) throw new ApiError(404, { message: 'Material not found.' })
    materialsStore[index] = { ...materialsStore[index], ...input, updatedAt: new Date().toISOString() }
    return { ...materialsStore[index], currentStock: currentStockFor(id) }
  },

  async listProducts(): Promise<Product[]> {
    await mockDelay()
    return productsStore
  },

  async createProduct(input: ProductInput): Promise<Product> {
    await mockDelay(400)
    const product: Product = {
      id: allocateProductId(),
      ...input,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    productsStore.push(product)
    return product
  },

  async updateProduct(id: EntityId, input: ProductUpdateInput): Promise<Product> {
    await mockDelay(400)
    const index = productsStore.findIndex((p) => p.id === id)
    if (index === -1) throw new ApiError(404, { message: 'Product not found.' })
    productsStore[index] = { ...productsStore[index], ...input, updatedAt: new Date().toISOString() }
    return productsStore[index]
  },
}
