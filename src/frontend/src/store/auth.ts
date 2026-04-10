import { create } from "zustand";
import type { AppRole } from "../types";

interface AuthState {
  isAuthenticated: boolean;
  principal: string | null;
  role: AppRole;
  isLoading: boolean;
  isSuperAdmin: boolean;
  isAgencyOwner: boolean;
  isOnboarded: boolean;
  agencyId: string | undefined;
  agencyName: string | undefined;
  setAuthenticated: (principal: string) => void;
  setRole: (role: AppRole) => void;
  setLoading: (loading: boolean) => void;
  setSuperAdmin: (value: boolean) => void;
  setAgencyOwner: (value: boolean) => void;
  setOnboarded: (value: boolean) => void;
  setAgencyId: (agencyId: string | undefined) => void;
  setAgencyName: (name: string | undefined) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  principal: null,
  role: null,
  isLoading: true,
  isSuperAdmin: false,
  isAgencyOwner: false,
  isOnboarded: false,
  agencyId: undefined,
  agencyName: undefined,

  setAuthenticated: (principal: string) =>
    set({ isAuthenticated: true, principal, isLoading: false }),

  setRole: (role: AppRole) => set({ role }),

  setLoading: (loading: boolean) => set({ isLoading: loading }),

  setSuperAdmin: (value: boolean) => set({ isSuperAdmin: value }),

  setAgencyOwner: (value: boolean) => set({ isAgencyOwner: value }),

  setOnboarded: (value: boolean) => set({ isOnboarded: value }),

  setAgencyId: (agencyId: string | undefined) => set({ agencyId }),

  setAgencyName: (name: string | undefined) => set({ agencyName: name }),

  logout: () =>
    set({
      isAuthenticated: false,
      principal: null,
      role: null,
      isLoading: false,
      isSuperAdmin: false,
      isAgencyOwner: false,
      isOnboarded: false,
      agencyId: undefined,
      agencyName: undefined,
    }),
}));
