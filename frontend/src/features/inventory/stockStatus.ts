export type StockStatus = 'green' | 'yellow' | 'red'

/**
 * Green: stock > 2x reorder point. Yellow: stock > reorder but < 2x.
 * Red: stock <= reorder point. Shared by the Inventory Dashboard, Item
 * Master material list, and anywhere else that needs the same threshold
 * (PHASE_MAP.md §12.1 "Current Stock Overview").
 */
export function getStockStatus(currentStock: number, reorderPoint: number): StockStatus {
  if (currentStock <= reorderPoint) return 'red'
  if (currentStock > reorderPoint * 2) return 'green'
  return 'yellow'
}

export const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  green: 'OK',
  yellow: 'Watch',
  red: 'Low stock',
}

export const STOCK_STATUS_CLASSES: Record<StockStatus, string> = {
  green: 'font-semibold text-brand-700',
  yellow: 'font-semibold text-amber-700',
  red: 'font-semibold text-red-700',
}
