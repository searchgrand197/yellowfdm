import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api } from '../api/client'
import { firebaseLogout } from '../lib/firebase'
import type { User } from '../types'

interface AuthContextValue {
  user: User | null
  phone: string | null
  loading: boolean
  loginWithFirebasePhone: (phone: string, name?: string) => Promise<User>
  loginWithPassword: (username: string, password: string) => Promise<User>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [phone, setPhone] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    try {
      const data = await api.me()
      if (data && 'id' in data) {
        setUser(data)
        setPhone(data.username)
      } else {
        setUser(null)
        setPhone(null)
      }
    } catch {
      setUser(null)
      setPhone(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      phone,
      loading,
      refresh,
      loginWithFirebasePhone: async (phoneNumber, name) => {
        const cleaned = phoneNumber.replace(/\D/g, '').slice(-10)
        const data = await api.firebaseLogin(cleaned, name)
        setUser(data)
        setPhone(data.phone || cleaned)
        return data
      },
      loginWithPassword: async (username, password) => {
        const data = await api.login(username, password)
        setUser(data)
        setPhone(data.username)
        return data
      },
      logout: async () => {
        try {
          await api.logout()
        } catch {
          /* ignore */
        }
        try {
          await firebaseLogout()
        } catch {
          /* ignore */
        }
        setUser(null)
        setPhone(null)
      },
    }),
    [user, phone, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
