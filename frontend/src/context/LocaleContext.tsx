'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { io, Socket } from 'socket.io-client';
import { dictionaries } from '../i18n';
import { useAuth } from '../hooks/useAuth';
import { fetchApi } from '../lib/api';
import {
  DEFAULT_LOCALE,
  interpolate,
  isLocale,
  LOCALE_META,
  Locale,
  normalizeLocale,
} from '../i18n/types';

const STORAGE_KEY = 'farmconnect_locale';
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

export interface LocaleContextValue {
  locale: Locale;
  /** Switches the interface language immediately (no reload required). */
  setLocale: (locale: Locale, options?: { sync?: boolean }) => void;
  /** Translates a key, optionally interpolating `{placeholder}` tokens. */
  t: (key: string, params?: Record<string, string | number>) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatCurrency: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatDate: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  formatDateTime: (value: Date | string | number) => string;
  /** BCP-47 tag of the active locale (`en-IN`, `kn-IN`, `hi-IN`). */
  intlTag: string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

function readStoredLocale(): Locale | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isLocale(stored) ? stored : null;
  } catch {
    return null;
  }
}

function readToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return (
      window.localStorage.getItem('farmconnect_token') ||
      window.localStorage.getItem('fc_token') ||
      null
    );
  } catch {
    return null;
  }
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const socketRef = useRef<Socket | null>(null);
  const mountedRef = useRef(false);
  const { token, user } = useAuth();

  // 0. The login / register response already carries the account language, so
  //    the interface follows it immediately without an extra round trip.
  useEffect(() => {
    const accountLocale = normalizeLocale(user?.preferredLanguage);
    if (!user?.preferredLanguage) return;
    if (accountLocale !== locale) {
      setLocaleState(accountLocale);
      try {
        window.localStorage.setItem(STORAGE_KEY, accountLocale);
      } catch {
        /* ignore */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.preferredLanguage]);

  // 1. Restore the locally stored preference (works for logged-out visitors).
  useEffect(() => {
    const stored = readStoredLocale();
    if (stored) {
      setLocaleState(stored);
    }
    mountedRef.current = true;
  }, []);

  // 2. Keep the account preference and the other client in sync.
  //
  //    The effect follows the session: when the visitor signs in the account
  //    preference is adopted and the real-time channel is opened; when they
  //    sign out the channel is closed but the local preference is kept.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let cancelled = false;

    const applyServerLanguage = async () => {
      try {
        // `fetchApi` already resolves the configured API base URL (which
        // includes the `/api` prefix) and attaches the bearer token.
        const payload = await fetchApi<any>('/users/me', { cache: 'no-store' });
        const serverLocale = normalizeLocale(
          payload?.data?.preferredLanguage ?? payload?.user?.preferredLanguage
        );
        if (!cancelled && serverLocale && serverLocale !== locale) {
          setLocaleState(serverLocale);
          try {
            window.localStorage.setItem(STORAGE_KEY, serverLocale);
          } catch {
            /* storage may be unavailable in private mode */
          }
        }
      } catch {
        /* offline: the local preference stays in effect */
      }
    };

    if (!token) {
      // Signed out: no account to follow, keep the local preference.
      return;
    }

    applyServerLanguage();

    // Live updates: the Android app (or another browser tab) can change the
    // account language and the website follows immediately.
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('language_preference_updated', (payload: any) => {
      const next = normalizeLocale(payload?.preferredLanguage);
      setLocaleState(next);
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
    });

    return () => {
      cancelled = true;
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const setLocale = useCallback((next: Locale, options?: { sync?: boolean }) => {
    const normalized = normalizeLocale(next);
    setLocaleState(normalized);

    if (typeof document !== 'undefined') {
      document.documentElement.lang = normalized;
    }

    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(STORAGE_KEY, normalized);
      } catch {
        /* ignore */
      }

      // Logged-in accounts share the preference with the other client.
      const shouldSync = options?.sync !== false;
      const token = readToken();
      if (shouldSync && token) {
        fetchApi('/users/me', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ preferredLanguage: normalized }),
        }).catch(() => {
          /* the local preference is still applied */
        });
      }
    }
  }, []);

  const value = useMemo<LocaleContextValue>(() => {
    const table = dictionaries[locale] ?? dictionaries.en;
    const intlTag = LOCALE_META[locale]?.intlTag ?? 'en-IN';

    return {
      locale,
      setLocale,
      t: (key: string, params?: Record<string, string | number>) => {
        const template = table[key] ?? dictionaries.en[key] ?? key;
        return interpolate(template, params);
      },
      formatNumber: (input: number, options?: Intl.NumberFormatOptions) =>
        new Intl.NumberFormat(intlTag, options).format(input),
      formatCurrency: (input: number, options?: Intl.NumberFormatOptions) =>
        new Intl.NumberFormat(intlTag, {
          style: 'currency',
          currency: 'INR',
          maximumFractionDigits: 2,
          ...options,
        }).format(input),
      formatDate: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => {
        const date = value instanceof Date ? value : new Date(value);
        if (Number.isNaN(date.getTime())) return '';
        return new Intl.DateTimeFormat(
          intlTag,
          options ?? { day: 'numeric', month: 'short', year: 'numeric' }
        ).format(date);
      },
      formatDateTime: (value: Date | string | number) => {
        const date = value instanceof Date ? value : new Date(value);
        if (Number.isNaN(date.getTime())) return '';
        return new Intl.DateTimeFormat(intlTag, {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }).format(date);
      },
      intlTag,
    };
  }, [locale, setLocale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocaleContext(): LocaleContextValue {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocaleContext must be used inside <LocaleProvider>');
  }
  return context;
}

export default LocaleProvider;
