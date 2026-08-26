/**
 * Lightweight fuzzy matching for the mock API only — real fuzzy search
 * (trigram/soundex/etc.) belongs server-side. This exists so the search-first
 * farmer flow (Business_Rules R7b) has believable "likely matches" behavior
 * without a backend yet.
 */
function levenshtein(a: string, b: string): number {
  const matrix = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost)
    }
  }
  return matrix[a.length][b.length]
}

/** Returns a 0-1 similarity score — 1 is an exact match (case-insensitive). */
export function fuzzyScore(query: string, target: string): number {
  const a = query.trim().toLowerCase()
  const b = target.trim().toLowerCase()
  if (!a) return 0
  if (b.includes(a)) return 1
  const distance = levenshtein(a, b)
  const maxLen = Math.max(a.length, b.length)
  return maxLen === 0 ? 0 : Math.max(0, 1 - distance / maxLen)
}
