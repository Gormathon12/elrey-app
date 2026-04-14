import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,
      user: null,

      setAuth: (token, user) => set({ token, user }),

      clearAuth: () => set({ token: null, user: null }),

      isAuthenticated: () => !!get().token,

      hasRole: (...roles) => roles.includes(get().user?.rol),
    }),
    {
      name: 'elrey-auth',
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
)
