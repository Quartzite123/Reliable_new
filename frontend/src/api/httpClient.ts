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

  constructor(status: number, shape: ApiErrorShape) {
    super(shape.message)
    this.status = status
    this.code = shape.code
    this.fieldErrors = shape.fieldErrors
  }
}

let accessToken: string | null = null

/** Auth context is the only caller — token is held in memory only, never persisted. */
export function setAccessToken(token: string | null) {
  accessToken = token
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, ...rest } = options

  // FormData (file uploads) must pass through untouched — toSnake would
  // walk it as a plain object and destroy the actual file payload, and it
  // must never be JSON.stringify'd (the browser sets its own multipart
  // Content-Type boundary). Everything else is a plain JSON body.
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
    throw new ApiError(response.status, shape)
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
