'use client';

import { useState, useEffect, useCallback } from 'react';

export type UserRole = 'FARMER' | 'CONSUMER' | 'ADMIN';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: UserRole;
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
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  refreshUser: () => void;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadFromStorage = useCallback(() => {
    try {
      // Check both token locations so older and newer components can find it
      const storedToken =
        localStorage.getItem('fc_token') ||
        localStorage.getItem('farmconnect_token');

      const storedUser = localStorage.getItem('fc_user');

      if (storedToken) {
        setToken(storedToken);

        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser));
          } catch {
            setUser(null);
          }
        } else {
          // If no stored fc_user exists, check if role was stored separately
          const storedRole = localStorage.getItem('farmconnect_role') as UserRole;
          if (storedRole) {
            setUser({
              id: '',
              email: '',
              name: '',
              role: storedRole,
            });
          } else {
            setUser(null);
          }
        }
      } else {
        setToken(null);
        setUser(null);
      }
    } catch {
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFromStorage();

    const handleStorageChange = (e: StorageEvent) => {
      if (
        e.key === 'fc_token' ||
        e.key === 'fc_user' ||
        e.key === 'farmconnect_token' ||
        e.key === 'farmconnect_role'
      ) {
        loadFromStorage();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [loadFromStorage]);

  const login = useCallback((newToken: string, newUser: AuthUser) => {
    // 1. Save keys used by components and sockets
    localStorage.setItem('fc_token', newToken);
    localStorage.setItem('fc_user', JSON.stringify(newUser));

    // 2. Save keys used by page redirects and middleware
    localStorage.setItem('farmconnect_token', newToken);
    localStorage.setItem('farmconnect_role', newUser.role);

    // 3. Set cookies so Next.js middleware allows authenticated navigation
    document.cookie = `farmconnect_token=${newToken}; path=/; max-age=86400; SameSite=Lax`;
    document.cookie = `farmconnect_role=${newUser.role}; path=/; max-age=86400; SameSite=Lax`;

    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    // Clear all storage keys across both formats
    localStorage.removeItem('fc_token');
    localStorage.removeItem('fc_user');
    localStorage.removeItem('farmconnect_token');
    localStorage.removeItem('farmconnect_role');

    // Expire authentication cookies
    document.cookie = 'farmconnect_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax';
    document.cookie = 'farmconnect_role=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax';

    setToken(null);
    setUser(null);
  }, []);

  return {
    user,
    token,
    isAuthenticated: Boolean(token && user),
    isLoading,
    login,
    logout,
    refreshUser: loadFromStorage,
  };
}