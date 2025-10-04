import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../lib/axios';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      company: null,
      token: null,
      isAuthenticated: false,

      setAuth: (data) => {
        localStorage.setItem('token', data.token);
        set({
          user: data.user,
          company: data.company,
          token: data.token,
          isAuthenticated: true,
        });
      },

      logout: () => {
        localStorage.removeItem('token');
        set({
          user: null,
          company: null,
          token: null,
          isAuthenticated: false,
        });
      },

      updateUser: (userData) => {
        set((state) => ({
          user: { ...state.user, ...userData },
        }));
      },

      fetchCurrentUser: async () => {
        try {
          const response = await api.get('/auth/me');
          set({
            user: response.data.data.user,
            company: response.data.data.company,
            isAuthenticated: true,
          });
        } catch (error) {
          set({
            user: null,
            company: null,
            token: null,
            isAuthenticated: false,
          });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        company: state.company,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
