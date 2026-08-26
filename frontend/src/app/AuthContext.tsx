import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { setAccessToken } from '@/api/httpClient'
import { authApi, type AuthSession, type LoginCredentials } from '@/features/auth'
import type { User } from '@/types/common'

interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  login: (credentials: LoginCredentials) => Promise<void>
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

  const applySession = useCallback((session: AuthSession) => {
    setUser(session.user)
    setRefreshToken(session.tokens.refreshToken)
    setAccessToken(session.tokens.accessToken)
  }, [])

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      const session = await authApi.login(credentials)
      applySession(session)
    },
    [applySession],
  )

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } finally {
      setUser(null)
      setRefreshToken(null)
      setAccessToken(null)
    }
  }, [])

  const refreshSession = useCallback(async () => {
    if (!refreshToken) return
    try {
      const tokens = await authApi.refresh(refreshToken)
      setRefreshToken(tokens.refreshToken)
      setAccessToken(tokens.accessToken)
    } catch {
      // Refresh failing means the session is gone — return the user to login safely (§27).
      setUser(null)
      setRefreshToken(null)
      setAccessToken(null)
    }
  }, [refreshToken])

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
