"use client"

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react"
import type { UserProfile } from "@/types/auth"
import { apiFetch, ApiError } from "@/lib/api-client"

interface AuthState {
  user: UserProfile | null
  token: string | null
  isLoading: boolean
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const AUTH_TOKEN_KEY = "auth_token"
const AUTH_USER_KEY = "auth_user"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isLoading: true,
  })

  useEffect(() => {
    try {
      const token = localStorage.getItem(AUTH_TOKEN_KEY)
      const userRaw = localStorage.getItem(AUTH_USER_KEY)
      if (token && userRaw) {
        const user = JSON.parse(userRaw) as UserProfile
        setState({ user, token, isLoading: false })
      } else {
        setState((prev) => ({ ...prev, isLoading: false }))
      }
    } catch {
      setState((prev) => ({ ...prev, isLoading: false }))
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiFetch<{ token: string; user: UserProfile }>(
      "/api/v1/auth/login",
      {
        method: "POST",
        body: JSON.stringify({ email, password }),
      },
    )

    localStorage.setItem(AUTH_TOKEN_KEY, data.token)
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user))

    setState({ user: data.user, token: data.token, isLoading: false })
  }, [])

  const logout = useCallback(async () => {
    try {
      await apiFetch("/api/v1/auth/logout", { method: "POST" })
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        // Token already invalid — proceed with local cleanup
      } else {
        console.warn("Logout request failed:", err)
      }
    } finally {
      localStorage.removeItem(AUTH_TOKEN_KEY)
      localStorage.removeItem(AUTH_USER_KEY)
      setState({ user: null, token: null, isLoading: false })
    }
  }, [])

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return ctx
}
