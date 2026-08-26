import { describe, expect, it } from 'vitest'
import { roleHasPermission } from './permissions'

describe('roleHasPermission', () => {
  it('gives admin every permission a normal role has', () => {
    expect(roleHasPermission('admin', 'farmers:create')).toBe(true)
    expect(roleHasPermission('admin', 'inventory:manage')).toBe(true)
    expect(roleHasPermission('admin', 'users:manage')).toBe(true)
  })

  it('restricts Lab Worker to lab sampling + read-only plot/field-QC reference', () => {
    expect(roleHasPermission('lab_worker', 'labSamples:create')).toBe(true)
    expect(roleHasPermission('lab_worker', 'plots:read')).toBe(true)
    expect(roleHasPermission('lab_worker', 'contracts:create')).toBe(false)
    expect(roleHasPermission('lab_worker', 'inventory:manage')).toBe(false)
  })

  it('keeps Field Worker off office-only and inventory-only actions', () => {
    expect(roleHasPermission('field_worker', 'fieldQc:create')).toBe(true)
    expect(roleHasPermission('field_worker', 'contracts:create')).toBe(false)
    expect(roleHasPermission('field_worker', 'inventory:manage')).toBe(false)
  })

  it('keeps Stock/Inventory Manager off farmer-workflow creation', () => {
    expect(roleHasPermission('stock_manager', 'inventory:manage')).toBe(true)
    expect(roleHasPermission('stock_manager', 'purchaseOrders:create')).toBe(true)
    expect(roleHasPermission('stock_manager', 'farmers:create')).toBe(false)
  })
})
