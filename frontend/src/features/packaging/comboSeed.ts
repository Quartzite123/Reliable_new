import type { GrapeVariety } from '@/features/plots'

export type PackSize = '4 Kg' | '4.5 Kg' | '5 Kg'
export const PACK_SIZES: PackSize[] = ['4 Kg', '4.5 Kg', '5 Kg']

export type ComplianceType = 'EU' | 'Non-Testing'
export const COMPLIANCE_TYPES: ComplianceType[] = ['EU', 'Non-Testing']

/**
 * Valid variety -> customer name -> pack size combinations, hardcoded from
 * the Excel per CLAUDE.md §9 ("hardcode the valid variety→customer→pack-size
 * combinations ... until Phase 9A's item_master_products table exists").
 * Swap this for a live query once that table is built.
 */
export const VALID_COMBOS: Array<{ variety: GrapeVariety; customerName: string; packSizes: PackSize[] }> = [
  { variety: 'Sonaka', customerName: 'MASCL', packSizes: ['4 Kg'] },
  { variety: 'Thompson Seedless', customerName: 'MASCL', packSizes: ['4.5 Kg', '5 Kg'] },
  { variety: 'Thompson Seedless', customerName: 'OFD', packSizes: ['4.5 Kg', '5 Kg'] },
  { variety: 'Thompson Seedless', customerName: 'Roveg', packSizes: ['4.5 Kg', '5 Kg'] },
  { variety: 'Thompson Seedless', customerName: 'FS', packSizes: ['4.5 Kg', '5 Kg'] },
  { variety: 'Thompson Seedless', customerName: 'N&K', packSizes: ['4.5 Kg', '5 Kg'] },
  { variety: 'Sharad Seedless', customerName: 'MASCL', packSizes: ['4.5 Kg', '5 Kg'] },
  { variety: 'Flame', customerName: 'N&K', packSizes: ['5 Kg'] },
  { variety: 'Crimson', customerName: 'N&K', packSizes: ['5 Kg'] },
  { variety: 'Black Jumbo Seedless', customerName: 'MASCL', packSizes: ['4.5 Kg'] },
  { variety: 'Black Jumbo Seedless', customerName: 'Boon Kee', packSizes: ['5 Kg'] },
]

export function customersForVariety(variety: GrapeVariety): string[] {
  return VALID_COMBOS.filter((c) => c.variety === variety).map((c) => c.customerName)
}

export function packSizesFor(variety: GrapeVariety, customerName: string): PackSize[] {
  return VALID_COMBOS.find((c) => c.variety === variety && c.customerName === customerName)?.packSizes ?? []
}
