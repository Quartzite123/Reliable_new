import type { ApiErrorShape } from '@/types/common'
import { toCamel, toSnake } from './transforms'

/**
 * Low-level typed HTTP client. Contains no business logic — feature
 * `api.ts` modules call this and shape the result into domain types.
 * Swap `API_BASE_URL` via env when the real backend is ready; nothing
 * else in the app needs to change.
 *
 * Default matches the real backend's actual mount point — every route in
 * the generated openapi.json is under `/api/v1` (e.g. `/api/v1/farmers`),
 * not just `/api`.
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

export class ApiError extends Error {
  code?: string
  fieldErrors?: Record<string, string>
  status: number
  /**
   * Set by the 401 interceptor below when it has already shown a toast
   * and redirected to /login for this error (session expired or
   * password changed) — 2026-09-02. `toFriendlyMessage` returns '' when
   * this is true, so components that blindly `showToast(toFriendlyMessage(error), 'error')`
   * don't show a second, redundant toast on top of the global one.
   */
  handledGlobally: boolean

  constructor(status: number, shape: ApiErrorShape, handledGlobally = false) {
    super(shape.message)
    this.status = status
    this.code = shape.code
    this.fieldErrors = shape.fieldErrors
    this.handledGlobally = handledGlobally
  }
}

let accessToken: string | null = null

/** Auth context is the only caller — token is held in memory only, never persisted. */
export function setAccessToken(token: string | null) {
  accessToken = token
  if (token) sessionExpiredNotified = false // a fresh token re-arms the notifier for next time
}

export type SessionExpiredReason = 'password_changed' | 'expired'
export type RefreshOutcome = { ok: true; accessToken: string } | { ok: false; reason: SessionExpiredReason }

let refreshHandler: (() => Promise<RefreshOutcome>) | null = null
let sessionExpiredHandler: ((reason: SessionExpiredReason) => void) | null = null
let inFlightRefresh: Promise<RefreshOutcome> | null = null
let sessionExpiredNotified = false

/**
 * AuthContext calls this once on mount. httpClient can't import
 * AuthContext directly — AuthContext already imports httpClient, so that
 * would be a cycle — so the dependency runs this direction instead.
 */
export function registerAuthHandlers(handlers: {
  refresh: () => Promise<RefreshOutcome>
  onSessionExpired: (reason: SessionExpiredReason) => void
}) {
  refreshHandler = handlers.refresh
  sessionExpiredHandler = handlers.onSessionExpired
}

/**
 * Concurrent 401s (a page firing several requests at once) must trigger
 * exactly one /auth/refresh call, not one per request. The check-and-set
 * here is synchronous (no `await` before `inFlightRefresh` is assigned),
 * so every 401 that lands before the first refresh resolves sees the
 * same in-flight promise and awaits it instead of starting its own.
 */
function refreshOnce(): Promise<RefreshOutcome> {
  if (!refreshHandler) return Promise.resolve({ ok: false, reason: 'expired' })
  if (!inFlightRefresh) {
    inFlightRefresh = refreshHandler().finally(() => {
      inFlightRefresh = null
    })
  }
  return inFlightRefresh
}

/** Same reasoning as refreshOnce — several requests can discover the failure at once; only the first should fire the toast/redirect. */
function notifySessionExpired(reason: SessionExpiredReason) {
  if (sessionExpiredNotified) return
  sessionExpiredNotified = true
  sessionExpiredHandler?.(reason)
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
}

/**
 * `isRetry` is internal-only (never passed by callers) — guards against
 * looping if a just-refreshed token still somehow 401s.
 */
async function request<T>(path: string, options: RequestOptions = {}, isRetry = false): Promise<T> {
  const { body, headers, ...rest } = options

  // FormData (file uploads) must pass through untouched — toSnake would
  // walk it as a plain object and destroy the actual file payload, and it
  // must never be JSON.stringify'd (the browser sets its own multipart
  // Content-Type boundary). Everything else is a plain JSON body.
  //
  // Reuse safety for the 401-retry path below (2026-09-02): neither a
  // FormData nor the Blob/File entries inside it are one-shot streams —
  // passing the same FormData object to fetch() twice sends the full
  // body both times (verified directly: two identical requests, same
  // byte count, same object). Only a raw ReadableStream body would be
  // consumed on first use, and this codebase never constructs one — the
  // JSON.stringify branch below produces a plain string, also trivially
  // re-sendable. Don't "fix" this into a bug by trying to clone the body.
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData
  const outgoingBody = body === undefined ? undefined : isFormData ? body : JSON.stringify(toSnake(body))

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    body: outgoingBody,
  })

  if (!response.ok) {
    let shape: ApiErrorShape = { message: 'Something went wrong. Please try again.' }
    try {
      shape = toCamel(await response.json()) as ApiErrorShape
    } catch {
      // non-JSON error body, keep the generic message
    }

    // Never for /auth/login (no session to refresh) or /auth/refresh
    // itself (would recurse). One retry only (isRetry guards it) — if
    // the token we just refreshed still 401s, stop and fail rather than
    // loop.
    const isAuthEndpoint = path === '/auth/login' || path === '/auth/refresh'
    let handledGlobally = false
    if (response.status === 401 && !isAuthEndpoint) {
      if (shape.code === 'password_changed') {
        // Refreshing would be doomed — see core/deps.py's
        // _password_changed_exc comment. Skip straight to the
        // expired-session path instead of a wasted network round-trip.
        notifySessionExpired('password_changed')
        handledGlobally = true
      } else if (!isRetry) {
        const outcome = await refreshOnce()
        if (outcome.ok) {
          setAccessToken(outcome.accessToken)
          return request<T>(path, options, true)
        }
        notifySessionExpired(outcome.reason)
        handledGlobally = true
      } else {
        notifySessionExpired('expired')
        handledGlobally = true
      }
    }

    throw new ApiError(response.status, shape, handledGlobally)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return toCamel(await response.json()) as T
}

export const httpClient = {
  get: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'POST', body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: 'DELETE' }),
}

/** True unless explicitly wired to a live backend — flips per-env, never per-component. */
export const USE_MOCK_API = import.meta.env.VITE_USE_MOCK !== 'false'
