/**
 * Converts snake_case keys to camelCase recursively.
 * Used to normalize backend responses before they reach app code.
 */
export function toCamel(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(toCamel)
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [
        k.replace(/_([a-z])/g, (_, c) => c.toUpperCase()),
        toCamel(v),
      ]),
    )
  }
  return obj
}

/**
 * Converts camelCase keys to snake_case recursively.
 * Used to normalize request bodies before sending to backend.
 */
export function toSnake(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(toSnake)
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [
        k.replace(/([A-Z])/g, '_$1').toLowerCase(),
        toSnake(v),
      ]),
    )
  }
  return obj
}
