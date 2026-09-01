import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError, registerAuthHandlers, setAccessToken, type RefreshOutcome } from '@/api/httpClient'
import { authApi, type AuthSession, type LoginCredentials } from '@/features/auth'
import { useToast } from './ToastContext'
import type { User } from '@/types/common'

interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  login: (credentials: LoginCredentials) => Promise<User>
  logout: () => Promise<void>
  /** Silently exchanges the held refresh token for a new access token. */
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

/**
 * Auth state lives only in React state per CLAUDE.md §12 ("Never use
 * localStorage/sessionStorage"). This means a hard page reload requires a
 * fresh login — that's the accepted tradeoff of the constraint, not a bug.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [refreshToken, setRefreshToken] = useState<string | null>(null)
  const navigate = useNavigate()
  const { showToast } = useToast()

  const applySession = useCallback((session: AuthSession) => {
    setUser(session.user)
    setRefreshToken(session.tokens.refreshToken)
    setAccessToken(session.tokens.accessToken)
  }, [])

  const clearSession = useCallback(() => {
    setUser(null)
    setRefreshToken(null)
    setAccessToken(null)
  }, [])

  const login = useCallback(
    async (credentials: LoginCredentials): Promise<User> => {
      const session = await authApi.login(credentials)
      applySession(session)
      return session.user
    },
    [applySession],
  )

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } finally {
      clearSession()
    }
  }, [clearSession])

  /**
   * Shared by the exposed refreshSession() and the interceptor registered
   * below (registerAuthHandlers) — one implementation, not two. Returns
   * an outcome rather than throwing so httpClient's interceptor can
   * distinguish "refresh token simply expired" from "password changed,
   * don't bother retrying anything" (2026-09-02).
   */
  const performRefresh = useCallback(async (): Promise<RefreshOutcome> => {
    if (!refreshToken) return { ok: false, reason: 'expired' }
    try {
      const tokens = await authApi.refresh(refreshToken)
      setRefreshToken(tokens.refreshToken)
      setAccessToken(tokens.accessToken)
      return { ok: true, accessToken: tokens.accessToken }
    } catch (error) {
      const reason = error instanceof ApiError && error.code === 'password_changed' ? 'password_changed' : 'expired'
      return { ok: false, reason }
    }
  }, [refreshToken])

  const refreshSession = useCallback(async () => {
    await performRefresh()
  }, [performRefresh])

  /**
   * Wires httpClient's 401 interceptor to this context — see
   * httpClient.ts's registerAuthHandlers. Re-registers whenever
   * refreshToken/showToast/navigate change so the handler closure never
   * reads a stale refresh token.
   */
  useEffect(() => {
    registerAuthHandlers({
      refresh: performRefresh,
      onSessionExpired: (reason) => {
        clearSession()
        showToast(
          reason === 'password_changed'
            ? 'Your password was changed. Please log in again.'
            : 'Your session has expired. Please log in again.',
          'error',
        )
        navigate('/login', { replace: true })
      },
    })
  }, [performRefresh, clearSession, showToast, navigate])

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAuthenticated: user !== null, login, logout, refreshSession }),
    [user, login, logout, refreshSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
