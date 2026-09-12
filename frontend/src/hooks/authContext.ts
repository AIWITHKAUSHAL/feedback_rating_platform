/**
 * Admin session context and accessor hook.
 *
 * Kept separate from the provider component so this module exports no
 * components (which keeps fast refresh reliable).
 */
import { createContext, useContext } from "react";

import type { AdminProfile } from "../types";

export interface AuthContextValue {
  admin: AdminProfile | null;
  isAuthenticated: boolean;
  /** True while a token restored from localStorage is being validated. */
  initialising: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error("useAuth must be used inside an <AuthProvider>.");
  }
  return context;
}
