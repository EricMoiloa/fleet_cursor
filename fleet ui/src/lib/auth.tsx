// src/lib/auth.tsx
'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { apiGet, apiPost, apiPostForm } from '@/lib/apiClient';
import type { UserRole, User as AppUser, ApiUser } from '@/lib/types';
import { coerceUser } from '@/lib/types';

// Accept "role" in many shapes
type AnyRole = UserRole | string | { name?: string } | null | undefined;

type AuthContextType = {
  user: AppUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<AppUser | null>>;
  authHeaders: Record<string, string>;
  getDashboardPath: (roleMaybe?: AnyRole) => string;
};

const AuthContext = createContext<AuthContextType | null>(null);

// ---------- helpers ----------
const roleToSlug: Record<UserRole, string> = {
  'Ministry Admin': 'ministry-admin',
  'Fleet Manager': 'fleet-manager',
  'Supervisor': 'supervisor',
  'Driver': 'driver',
  'Worker': 'worker',
};

function normalizeRoleName(roleMaybe: AnyRole): UserRole {
  const raw = (
    typeof roleMaybe === 'string'
      ? roleMaybe
      : (roleMaybe as any)?.name ?? ''
  )
    .toString()
    .trim()
    .toLowerCase();

  if (raw.includes('supervisor')) return 'Supervisor';
  if (raw.includes('ministry') || raw === 'admin' || raw.includes('user admin'))
    return 'Ministry Admin';
  if (raw.includes('fleet')) return 'Fleet Manager';
  if (raw.includes('driver')) return 'Driver';
  return 'Worker';
}

function slugForRole(roleMaybe: AnyRole): string {
  const canonical = normalizeRoleName(roleMaybe);
  return roleToSlug[canonical] ?? 'worker';
}

function dashForRole(roleMaybe: AnyRole): string {
  return `/${slugForRole(roleMaybe)}/dashboard`;
}

// ---------- Provider ----------
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AppUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Hydrate from localStorage and (if token) verify via /me
  useEffect(() => {
    (async () => {
      const t = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const u = typeof window !== 'undefined' ? localStorage.getItem('user') : null;

      if (t) setToken(t);
      if (u) {
        try {
          setUser(coerceUser(JSON.parse(u)));
        } catch {
          localStorage.removeItem('user');
        }
      }

      if (t) {
        try {
          const me = await apiGet<ApiUser>('/me');
          const coerced = coerceUser(me);
          localStorage.setItem('user', JSON.stringify(coerced));
          setUser(coerced);
        } catch {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user');
          setToken(null);
          setUser(null);
        }
      }

      setIsLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const authHeaders: Record<string, string> =
    token ? { Authorization: `Bearer ${token}` } : {};

  const getDashboardPath = useCallback((roleMaybe?: AnyRole) => {
    return dashForRole(roleMaybe);
  }, []);

  /**
   * Robust login:
   * 1) Try JSON {email,password}
   * 2) If 422, retry as form-encoded
   * 3) After token, ALWAYS fetch /me and route by real role
   */
const login = useCallback(
  async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // 1) Hit /login using our api helper
      const res = await apiPost<any>('/login', { email, password });

      // 2) Normalize token & user from a variety of shapes
      let token: string | null =
        res?.token ??
        res?.access_token ??
        res?.bearer ??
        res?.api_token ??
        res?.data?.token ??
        res?.data?.access_token ??
        null;

      let apiUser: any =
        res?.user ??
        res?.data?.user ??
        (res && res.id && res.email ? res : null);

      // 3) If user missing but we got a token, temporarily store it and probe /me
      if (!apiUser && token) {
        localStorage.setItem('auth_token', token);
        try {
          const me = await apiGet<any>('/me'); // parse() already unwraps {data}
          const fromMe = me?.user ?? me;       // tolerate either {user} or bare user
          if (fromMe && fromMe.email) {
            apiUser = fromMe;
          }
        } catch {
          // bad token, drop it
          localStorage.removeItem('auth_token');
          token = null;
        }
      }

      if (!token || !apiUser) {
        console.error('Login response missing token/user. Raw:', res);
        throw new Error('Login succeeded but no token/user returned');
      }

      // 4) Persist and redirect
      const coerced = coerceUser(apiUser);
      localStorage.setItem('auth_token', token);
      localStorage.setItem('user', JSON.stringify(coerced));
      setToken(token);
      setUser(coerced);

      if (res?.requires_password_change) {
        router.replace('/change-password');
        return;
      }

      router.replace(getDashboardPath(coerced.role));
    } finally {
      setIsLoading(false);
    }
  },
  [getDashboardPath, router]
);


  const logout = useCallback(async () => {
    try {
      await apiPost('/logout', {});
    } catch {}
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    router.replace('/');
  }, [router]);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      token,
      isLoading,
      login,
      logout,
      setUser,
      authHeaders,
      getDashboardPath,
    }),
    [user, token, isLoading, login, logout, authHeaders, getDashboardPath]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

/**
 * AuthGuard
 * - waits for hydration
 * - if not logged in → redirect to "/"
 * - if roles given and user doesn't match → send them to their own dashboard
 */
export function AuthGuard({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles?: UserRole[];
}) {
  const { user, isLoading, getDashboardPath } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;

    // Not logged in → landing
    if (!user) {
      if (pathname !== '/') router.replace('/');
      return;
    }

    // Role-restricted page
    if (roles && user.role && !roles.includes(user.role)) {
      router.replace(getDashboardPath(user.role));
      return;
    }
  }, [user, roles, isLoading, router, pathname, getDashboardPath]);

  if (isLoading) return null;
  if (!user) return null;
  if (roles && user.role && !roles.includes(user.role)) return null;

  return <>{children}</>;
}

// Re-export unified type alias if needed elsewhere
export type { AppUser as AuthUserType };
