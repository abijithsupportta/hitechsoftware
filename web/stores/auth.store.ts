import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import type { UserRole } from '@/types/database.types';

interface AuthStoreState {
  user: User | null;
  session: Session | null;
  role: UserRole | null;
  /** false = auth check in-flight; true = check complete (with or without user) */
  isHydrated: boolean;
  setAuth: (payload: { user: User | null; session: Session | null; role: UserRole | null }) => void;
  clearAuth: () => void;
  setHydrated: (value: boolean) => void;
  resetStore: () => void;
}

const INITIAL_STATE = {
  user: null,
  session: null,
  role: null,
  // isHydrated starts false — prevents any flash of unauthenticated content
  // before the Supabase auth check resolves on app load.
  isHydrated: false,
} as const;

export const useAuthStore = create<AuthStoreState>((set) => ({
  ...INITIAL_STATE,

  setAuth: ({ user, session, role }) => set({ user, session, role }),

  // After clearing, isHydrated = true: hydration is complete, just with no user.
  clearAuth: () => set({ user: null, session: null, role: null, isHydrated: true }),

  setHydrated: (value) => set({ isHydrated: value }),

  // Full reset — used to return to app's initial zero state (e.g. on fatal auth error)
  resetStore: () => set({ ...INITIAL_STATE }),
}));
