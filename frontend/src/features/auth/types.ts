import type { User } from '@/types/common'

export interface LoginCredentials {
  email: string
  password: string
}

/**
 * Matches backend's Token schema (`POST /auth/login` response) after the
 * camelCase transform — verified via generated openapi.json. No `expiresAt`
 * — the backend does not send one.
 */
export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface AuthSession {
  user: User
  tokens: AuthTokens
}

export interface ChangePasswordInput {
  currentPassword: string
  newPassword: string
}
