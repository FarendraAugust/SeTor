'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { authApi, setAccessToken, getAccessToken } from '@/lib/api'
import type { AuthUser, AuthStatus } from '@/types/auth'

const ACCESS_TTL = 15 * 60 * 1000
const REFRESH_INTERVAL = ACCESS_TTL - 60 * 1000

interface AuthContextValue {
  user: AuthUser | null
  status: AuthStatus
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<boolean>
  updateProfile: (name: string) => Promise<AuthUser>
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')
  const statusRef = useRef<AuthStatus>('loading')
  const refreshTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  const setState = useCallback((next: { user: AuthUser | null; status: AuthStatus }) => {
    statusRef.current = next.status
    setUser(next.user)
    setStatus(next.status)
  }, [])

  const stopTimer = useCallback(() => {
    if (refreshTimer.current) {
      clearInterval(refreshTimer.current)
      refreshTimer.current = null
    }
  }, [])

  const refreshSession = useCallback(async (): Promise<boolean> => {
    try {
      const { accessToken } = await authApi.refresh()
      setAccessToken(accessToken)
      const { user } = await authApi.me()
      setState({ user, status: 'authenticated' })
      return true
    } catch {
      setAccessToken(null)
      setState({ user: null, status: 'unauthenticated' })
      stopTimer()
      return false
    }
  }, [setState, stopTimer])

  const startTimer = useCallback(() => {
    stopTimer()
    refreshTimer.current = setInterval(() => {
      void refreshSession()
    }, REFRESH_INTERVAL)
  }, [stopTimer, refreshSession])

  useEffect(() => {
    let mounted = true
    const init = async () => {
      await refreshSession()
    }
    queueMicrotask(() => {
      if (mounted) void init()
    })
    const onFocus = () => {
      if (statusRef.current !== 'authenticated') void refreshSession()
    }
    window.addEventListener('focus', onFocus)
    return () => {
      mounted = false
      window.removeEventListener('focus', onFocus)
      stopTimer()
    }
  }, [refreshSession, stopTimer])

  const login = useCallback(
    async (email: string, password: string) => {
      const { accessToken, user } = await authApi.login({ email, password })
      setAccessToken(accessToken)
      setState({ user, status: 'authenticated' })
      startTimer()
    },
    [setState, startTimer],
  )

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const { accessToken, user } = await authApi.register({ name, email, password })
      setAccessToken(accessToken)
      setState({ user, status: 'authenticated' })
      startTimer()
    },
    [setState, startTimer],
  )

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      // ignore network/worker errors during logout
    }
    setAccessToken(null)
    setState({ user: null, status: 'unauthenticated' })
    stopTimer()
  }, [setState, stopTimer])

  const updateProfile = useCallback(
    async (name: string) => {
      const { user } = await authApi.updateProfile({ name })
      setUser(user)
      return user
    },
    [],
  )

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      await authApi.changePassword({ currentPassword, newPassword })
      stopTimer()
      setAccessToken(null)
      setState({ user: null, status: 'unauthenticated' })
    },
    [setState, stopTimer],
  )

  return (
    <AuthContext.Provider
      value={{
        user,
        status,
        login,
        register,
        logout,
        refresh: refreshSession,
        updateProfile,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export { getAccessToken }
