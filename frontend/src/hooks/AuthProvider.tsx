/**
 * Admin session provider.
 *
 * The JWT lives in localStorage so a page refresh does not sign the admin out.
 * A restored token is validated against `/api/admin/auth/me`, and the API
 * client clears it automatically whenever the backend answers 401.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import * as adminApi from "../api/admin";
import {
  asApiError,
  clearStoredToken,
  getStoredToken,
  storeToken,
  UNAUTHORIZED_EVENT,
} from "../api/client";
import type { AdminProfile } from "../types";
import { AuthContext, type AuthContextValue } from "./authContext";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  // Starts false when there is nothing to validate, so no state update is
  // needed in the effect below for the signed-out case.
  const [initialising, setInitialising] = useState(() => getStoredToken() !== null);

  const signOut = useCallback(() => {
    clearStoredToken();
    setAdmin(null);
  }, []);

  // Validate a token restored from a previous session.
  useEffect(() => {
    if (getStoredToken() === null) return;

    let active = true;
    adminApi
      .fetchProfile()
      .then((profile) => {
        if (active) setAdmin(profile);
      })
      .catch(() => {
        if (active) signOut();
      })
      .finally(() => {
        if (active) setInitialising(false);
      });

    return () => {
      active = false;
    };
  }, [signOut]);

  // The API client dispatches this event when any request comes back 401.
  useEffect(() => {
    const handle = () => setAdmin(null);
    window.addEventListener(UNAUTHORIZED_EVENT, handle);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handle);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { access_token } = await adminApi.login(email, password);
      storeToken(access_token);
      setAdmin(await adminApi.fetchProfile());
    } catch (caught) {
      clearStoredToken();
      throw asApiError(caught);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ admin, isAuthenticated: admin !== null, initialising, signIn, signOut }),
    [admin, initialising, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
