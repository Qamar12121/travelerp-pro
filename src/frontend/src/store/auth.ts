import { create } from "zustand";
import type { AppRole } from "../types";

interface AuthState {
  isAuthenticated: boolean;
  principal: string | null;
  role: AppRole;
  isLoading: boolean;
  setAuthenticated: (principal: string) => void;
  setRole: (role: AppRole) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  principal: null,
  role: null,
  isLoading: true,

  setAuthenticated: (principal: string) =>
    set({ isAuthenticated: true, principal, isLoading: false }),

  setRole: (role: AppRole) => set({ role }),

  setLoading: (loading: boolean) => set({ isLoading: loading }),

  logout: () =>
    set({
      isAuthenticated: false,
      principal: null,
      role: null,
      isLoading: false,
    }),
}));
