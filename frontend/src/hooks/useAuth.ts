'use client';

import { useState, useEffect, useCallback } from 'react';

export type UserRole = 'FARMER' | 'CONSUMER' | 'ADMIN';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: UserRole;
  district?: string;
  state?: string;
  taluk?: string;
  pincode?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  farmerProfile?: {
    id: string;
    farmName: string;
    district: string;
    isVerified: boolean;
  } | null;
  consumerProfile?: {
    id: string;
    district?: string;
    deliveryAddress?: string;
  } | null;
}

export interface UseAuthReturn {
  user: AuthUser | null;
  token: string | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  refreshUser: () => void;
}

const AUTH_SYNC_EVENT = 'farmconnect_auth_sync';

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadFromStorage = useCallback(() => {
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }

    try {
      // 1. Resolve token across all legacy and current storage identifiers
      const storedToken =
        localStorage.getItem('farmconnect_token') ||
        localStorage.getItem('fc_token') ||
        null;

      // 2. Resolve user data across all storage identifiers
      const storedUserJson =
        localStorage.getItem('farmconnect_user') ||
        localStorage.getItem('fc_user') ||
        null;

      const rawRole = (
        localStorage.getItem('farmconnect_role') ||
        localStorage.getItem('role') ||
        ''
      ).toUpperCase();

      const storedRole: UserRole | null =
        rawRole === 'FARMER' || rawRole === 'CONSUMER' || rawRole === 'ADMIN'
          ? (rawRole as UserRole)
          : null;

      if (storedToken) {
        setToken(storedToken);

        if (storedUserJson) {
          try {
            const parsed = JSON.parse(storedUserJson);
            const normalizedRole = (parsed.role || storedRole || 'CONSUMER').toUpperCase() as UserRole;
            setUser({
              ...parsed,
              role: normalizedRole,
            });
          } catch {
            setUser(
              storedRole
                ? {
                    id: '',
                    email: '',
                    name: 'Verified User',
                    role: storedRole,
                  }
                : null
            );
          }
        } else if (storedRole) {
          setUser({
            id: '',
            email: '',
            name: 'Verified User',
            role: storedRole,
          });
        } else {
          setUser(null);
        }
      } else {
        setToken(null);
        setUser(null);
      }
    } catch (err) {
      console.warn('[useAuth] Storage hydration notice:', err);
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFromStorage();

    // Multi-tab storage synchronization
    const handleStorageChange = (e: StorageEvent) => {
      if (
        e.key === 'fc_token' ||
        e.key === 'fc_user' ||
        e.key === 'farmconnect_token' ||
        e.key === 'farmconnect_role' ||
        e.key === 'farmconnect_user' ||
        e.key === null
      ) {
        loadFromStorage();
      }
    };

    // Single-tab instant event synchronization
    const handleCustomSync = () => {
      loadFromStorage();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener(AUTH_SYNC_EVENT, handleCustomSync);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener(AUTH_SYNC_EVENT, handleCustomSync);
    };
  }, [loadFromStorage]);

  const login = useCallback((newToken: string, newUser: AuthUser) => {
    if (typeof window === 'undefined') return;

    const normalizedRole = (newUser.role || 'CONSUMER').toUpperCase() as UserRole;
    const sanitizedUser: AuthUser = {
      ...newUser,
      role: normalizedRole,
    };

    // 1. Sync localStorage across all supported client identifiers
    localStorage.setItem('farmconnect_token', newToken);
    localStorage.setItem('fc_token', newToken);
    localStorage.setItem('farmconnect_role', normalizedRole);
    localStorage.setItem('farmconnect_user', JSON.stringify(sanitizedUser));
    localStorage.setItem('fc_user', JSON.stringify(sanitizedUser));

    // 2. Sync cookies across all supported middleware identifiers (7-day validity)
    const cookieOptions = '; path=/; max-age=604800; SameSite=Lax';
    document.cookie = `token=${newToken}${cookieOptions}`;
    document.cookie = `fc_token=${newToken}${cookieOptions}`;
    document.cookie = `farmconnect_token=${newToken}${cookieOptions}`;
    document.cookie = `farmconnect_role=${normalizedRole}${cookieOptions}`;
    document.cookie = `role=${normalizedRole}${cookieOptions}`;

    // 3. Update React component state
    setToken(newToken);
    setUser(sanitizedUser);
    setIsLoading(false);

    // 4. Notify all listeners in the current tab tree
    window.dispatchEvent(new Event(AUTH_SYNC_EVENT));
  }, []);

  const logout = useCallback(() => {
    if (typeof window === 'undefined') return;

    // 1. Purge localStorage across all naming conventions
    localStorage.removeItem('farmconnect_token');
    localStorage.removeItem('fc_token');
    localStorage.removeItem('farmconnect_role');
    localStorage.removeItem('farmconnect_user');
    localStorage.removeItem('fc_user');

    // 2. Expire all session cookies immediately
    const expireOption = '; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax';
    document.cookie = `token=${expireOption}`;
    document.cookie = `fc_token=${expireOption}`;
    document.cookie = `farmconnect_token=${expireOption}`;
    document.cookie = `farmconnect_role=${expireOption}`;
    document.cookie = `role=${expireOption}`;

    // 3. Reset React component state
    setToken(null);
    setUser(null);
    setIsLoading(false);

    // 4. Notify all listeners in the current tab tree
    window.dispatchEvent(new Event(AUTH_SYNC_EVENT));
  }, []);

  return {
    user,
    token,
    role: user?.role || null,
    isAuthenticated: Boolean(token && user),
    isLoading,
    login,
    logout,
    refreshUser: loadFromStorage,
  };
}

export default useAuth;