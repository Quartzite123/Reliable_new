import { httpClient } from '@/api/httpClient'
import type { User } from '@/types/common'
import type { AuthSession, AuthTokens, ChangePasswordInput, LoginCredentials } from './types'

/**
 * Real backend implementation — swapped in via USE_MOCK_API.
 *
 * `POST /auth/login` returns the user alongside the tokens in one response
 * (`LoginResponse` — user/access_token/refresh_token/token_type), so no
 * separate `/users/me` round trip is needed.
 */
export const authApiReal = {
  async login(credentials: LoginCredentials): Promise<AuthSession> {
    const response = await httpClient.post<{ user: User; accessToken: string; refreshToken: string; tokenType: string }>(
      '/auth/login',
      credentials,
    )
    return {
      user: response.user,
      tokens: { accessToken: response.accessToken, refreshToken: response.refreshToken },
    }
  },

  /**
   * Backend's AccessToken response has no refresh_token field (verified via
   * openapi.json — refresh tokens are not rotated). The caller must keep
   * reusing the same refresh token; only the access token changes here.
   */
  async refresh(refreshToken: string): Promise<AuthTokens> {
    const result = await httpClient.post<{ accessToken: string; tokenType: string }>('/auth/refresh', {
      refreshToken,
    })
    return { accessToken: result.accessToken, refreshToken }
  },

  logout: () => httpClient.post<void>('/auth/logout'),

  /**
   * No `/auth/change-password` endpoint exists on the real backend
   * (verified via generated openapi.json — the only /auth routes are
   * login, refresh, logout). Rather than silently calling a nonexistent
   * path and letting it 404 unpredictably, this fails loudly and
   * explicitly so the UI can show something meaningful. Kept as a method
   * (rather than removed) so `authApi`'s real/mock shapes stay identical
   * — see api.mock.ts and ChangePasswordPage, which calls this. (There is
   * no forgotPassword — no self-service reset exists at all, 2026-09-01;
   * admin-set passwords are permanent, recovery is scripts/seed_admin.py.)
   */
  changePassword(_input: ChangePasswordInput): Promise<void> {
    return Promise.reject(
      new Error('Change password is not available yet — this endpoint does not exist on the backend.'),
    )
  },
}
