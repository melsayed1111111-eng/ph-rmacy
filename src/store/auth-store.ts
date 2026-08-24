import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { db } from '@/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'

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
        const trimmedUser = username.trim()
        const trimmedPass = password.trim()

        if (!trimmedUser || !trimmedPass) {
          return { success: false, error: 'يرجى إدخال اسم المستخدم وكلمة المرور' }
        }

        try {
          // 1. Direct check with Firebase Firestore settings
          try {
            const settingsDoc = await getDoc(doc(db, 'settings', 'global'))
            if (settingsDoc.exists()) {
              const data = settingsDoc.data()
              const validUser = (data.adminUsername || 'admin').trim()
              const validPass = (data.adminPassword || 'admin123').trim()

              if (trimmedUser === validUser && trimmedPass === validPass) {
                const token = `auth_token_fb_${Date.now()}`
                set({
                  isAuthenticated: true,
                  username: trimmedUser,
                  token
                })
                return { success: true }
              }
            }
          } catch (fbErr) {
            console.warn('Firestore auth check note:', fbErr)
          }

          // 2. Default fallback credentials check
          if (trimmedUser === 'admin' && trimmedPass === 'admin123') {
            const token = `auth_token_default_${Date.now()}`
            set({
              isAuthenticated: true,
              username: trimmedUser,
              token
            })
            return { success: true }
          }

          // 3. Backend API check
          try {
            const res = await fetch('/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username: trimmedUser, password: trimmedPass })
            })
            if (res.ok) {
              const data = await res.json()
              set({
                isAuthenticated: true,
                username: data.username || trimmedUser,
                token: data.token || `auth_token_${Date.now()}`
              })
              return { success: true }
            }
          } catch (apiErr) {
            console.warn('API login check note:', apiErr)
          }

          return { success: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة' }
        } catch (err) {
          console.error('Login error:', err)
          return { success: false, error: 'حدث خطأ أثناء محاولة تسجيل الدخول' }
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
