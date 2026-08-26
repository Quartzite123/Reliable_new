import { ApiError } from '@/api/httpClient'
import type { EntityId } from '@/types/common'
import { usersStore } from '@/features/users/mockStore'
import type { AuthSession, AuthTokens, ChangePasswordInput, ForgotPasswordInput, LoginCredentials } from './types'

function delay(ms = 350) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function issueTokens(userId: EntityId): AuthTokens {
  return {
    accessToken: `mock-access-${userId}-${Date.now()}`,
    refreshToken: `mock-refresh-${userId}`,
  }
}

export const authApiMock = {
  async login(credentials: LoginCredentials): Promise<AuthSession> {
    await delay()
    console.log('[mock login] attempting:', credentials.email)
    console.log('[mock login] store has:', usersStore.map(u => u.email))
    const account = usersStore.find((u) => u.email.toLowerCase() === credentials.email.toLowerCase())
    if (!account || account.password !== credentials.password) {
      throw new ApiError(401, { message: 'Incorrect email or password.' })
    }
    if (!account.active) {
      throw new ApiError(403, { message: 'This account has been deactivated. Contact your admin.' })
    }
    const { password: _password, ...user } = account
    return { user, tokens: issueTokens(user.id) }
  },

  async refresh(refreshToken: string): Promise<AuthTokens> {
    await delay(150)
    if (!refreshToken.startsWith('mock-refresh-')) {
      throw new ApiError(401, { message: 'Your session has expired. Please log in again.' })
    }
    const userId = Number(refreshToken.replace('mock-refresh-', ''))
    return issueTokens(userId)
  },

  async logout(): Promise<void> {
    await delay(100)
  },

  async changePassword(_input: ChangePasswordInput): Promise<void> {
    await delay()
  },

  async forgotPassword(_input: ForgotPasswordInput): Promise<void> {
    await delay()
  },
}
