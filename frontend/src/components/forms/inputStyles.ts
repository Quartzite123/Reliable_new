/**
 * Shared base classes for all text-like inputs (prompt.md 24).
 *
 * min-h-12 keeps every field above the 44px touch minimum for gloved or
 * imprecise taps. The field is white against the tinted page background so
 * the tap target is obvious without needing a heavy border, and focus
 * shows as a ring rather than a 1px colour change, which is invisible in
 * daylight on a phone.
 */
export const baseInputClass =
  'min-h-12 w-full rounded-lg border border-gray-300 bg-white px-3 text-base text-gray-900 placeholder:text-gray-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 focus:outline-none disabled:bg-gray-100 disabled:text-gray-500'

export const errorInputClass = 'border-status-failed focus:border-status-failed focus:ring-status-failed/20'
