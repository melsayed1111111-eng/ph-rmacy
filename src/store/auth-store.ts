import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  isAuthenticated: boolean
  username: string | null
  token: string | null
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      username: null,
      token: null,
      login: async (username: string, password: string) => {
        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
          })
          const data = await res.json()
          if (!res.ok) {
            return { success: false, error: data.error || 'فشل في تسجيل الدخول' }
          }
          set({
            isAuthenticated: true,
            username: data.username,
            token: data.token
          })
          return { success: true }
        } catch {
          return { success: false, error: 'حدث خطأ في الاتصال' }
        }
      },
      logout: () => {
        set({
          isAuthenticated: false,
          username: null,
          token: null
        })
      }
    }),
    {
      name: 'pharmacy-auth',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        username: state.username,
        token: state.token
      })
    }
  )
)
