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
      const storedToken = localStorage.getItem('fc_token');
      const storedUser = localStorage.getItem('fc_user');

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
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
      if (e.key === 'fc_token' || e.key === 'fc_user') {
        loadFromStorage();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [loadFromStorage]);

  const login = useCallback((newToken: string, newUser: AuthUser) => {
    localStorage.setItem('fc_token', newToken);
    localStorage.setItem('fc_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('fc_token');
    localStorage.removeItem('fc_user');
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