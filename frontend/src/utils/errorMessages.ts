import { ApiError } from '@/api/httpClient'

/**
 * Turns raw API/network errors into short, plain-language messages a
 * worker can act on (prompt.md §23 — never show "Invalid payload" /
 * "HTTP 422" style text). Backend-provided `message` is trusted first
 * since it already carries the specific rule that failed (e.g. gate
 * enforcement errors) — this only covers the generic fallback cases.
 */
export function toFriendlyMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Your session has expired. Please log in again.'
    if (error.status === 403) return 'You do not have permission to do this.'
    if (error.status === 404) return 'This record could not be found.'
    if (error.status >= 500) return 'The server had a problem. Please try again in a moment.'
    return error.message || 'This could not be saved. Please check the form and try again.'
  }

  if (error instanceof TypeError) {
    return 'Could not reach the server. Check your connection and try again.'
  }

  return 'Something went wrong. Please try again.'
}
