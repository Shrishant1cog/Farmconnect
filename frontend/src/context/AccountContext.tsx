'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAuth, AUTH_SYNC_EVENT } from '../hooks/useAuth';
import { fetchApi } from '../lib/api';
import {
  extractFavorites,
  extractNotificationList,
  extractUnreadCount,
  favoriteFarmerProfileId,
  favoriteProductId,
} from '../lib/account';

export interface AccountContextValue {
  /** The lots the account has marked as favourite. */
  favoriteProductIds: string[];
  /** The cultivators the account has marked as favourite. */
  favoriteFarmerIds: string[];
  /**
   * The favourite lots, exactly as the shared backend answered them.
   *
   * The list of the page and the badge of the navbar are read from the
   * same answer, so they can never disagree.
   */
  favoriteProducts: any[];
  /** The favourite cultivators, exactly as the backend answered them. */
  favoriteFarmers: any[];
  /** The notifications of the account, newest first. */
  notifications: any[];
  /**
   * The number of the notifications that were not read yet.
   *
   * `null` means that the platform did not say how many there are — no
   * badge is shown then, rather than a wrong number.
   */
  unreadCount: number | null;
  /** Is the state still being read from the shared backend? */
  loading: boolean;
  /** Is the account a buyer? Favourites are a feature of the buyer. */
  canFavorite: boolean;
  /** Reads the favourites and the inbox again. */
  refresh: () => Promise<void>;
  /**
   * Marks a lot as favourite or removes the mark.
   *
   * The answer of the shared backend decides — the interface never
   * assumes that the toggle worked.
   */
  toggleProduct: (productId: string) => Promise<boolean>;
  /** Marks a cultivator as favourite or removes the mark. */
  toggleFarmer: (farmerId: string) => Promise<boolean>;
  /** Marks one notification as read. */
  markRead: (notificationId: string) => Promise<void>;
  /** Marks every notification as read. */
  markAllRead: () => Promise<void>;
}

const AccountContext = createContext<AccountContextValue | null>(null);

/**
 * The favourites and the inbox of the signed-in account.
 *
 * The state lives in one place, so the badge of the navbar, the heart on
 * the marketplace and the list of the favourites always agree. Every
 * answer comes from the shared backend through `fetchApi` — the single
 * HTTP path of the website.
 */
export const AccountProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [favoriteProductIds, setFavoriteProductIds] = useState<string[]>([]);
  const [favoriteFarmerIds, setFavoriteFarmerIds] = useState<string[]>([]);
  const [favoriteProducts, setFavoriteProducts] = useState<any[]>([]);
  const [favoriteFarmers, setFavoriteFarmers] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const canFavorite = Boolean(user && user.role === 'CONSUMER');

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setFavoriteProductIds([]);
      setFavoriteFarmerIds([]);
      setFavoriteProducts([]);
      setFavoriteFarmers([]);
      setNotifications([]);
      setUnreadCount(null);
      return;
    }

    setLoading(true);
    try {
      // The favourites and the inbox are independent. One of them may
      // fail while the other answers, and a failure of one must not hide
      // the other.
      const [favoritesResult, notificationsResult] = await Promise.allSettled([
        fetchApi('/favorites'),
        fetchApi('/notifications'),
      ]);

      if (favoritesResult.status === 'fulfilled') {
        const favorites = extractFavorites(favoritesResult.value);
        setFavoriteProducts(favorites.products);
        setFavoriteFarmers(favorites.farmers);
        setFavoriteProductIds(
          favorites.products
            .map((entry: any) => favoriteProductId(entry))
            .filter((id: string | null): id is string => Boolean(id))
        );
        setFavoriteFarmerIds(
          favorites.farmers
            .map((entry: any) => favoriteFarmerProfileId(entry))
            .filter((id: string | null): id is string => Boolean(id))
        );
      }

      if (notificationsResult.status === 'fulfilled') {
        setNotifications(extractNotificationList(notificationsResult.value));
        setUnreadCount(extractUnreadCount(notificationsResult.value));
      }
    } catch (err: any) {
      console.warn('[Account] The account data could not be read:', err?.message);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => refresh();
    window.addEventListener(AUTH_SYNC_EVENT, handler);
    return () => window.removeEventListener(AUTH_SYNC_EVENT, handler);
  }, [refresh]);

  const toggleProduct = useCallback(
    async (productId: string) => {
      try {
        const res: any = await fetchApi(`/favorites/products/${productId}`, {
          method: 'POST',
        });
        const isFavorite = res?.isFavorite;
        setFavoriteProductIds((previous) => {
          if (isFavorite === false) {
            return previous.filter((id) => id !== productId);
          }
          return previous.includes(productId) ? previous : [...previous, productId];
        });
        return isFavorite !== false;
      } catch (err: any) {
        console.warn('[Account] The lot could not be marked:', err?.message);
        // The state is not changed: the platform did not confirm it.
        await refresh();
        return false;
      }
    },
    [refresh]
  );

  const toggleFarmer = useCallback(
    async (farmerId: string) => {
      try {
        const res: any = await fetchApi(`/favorites/farmers/${farmerId}`, {
          method: 'POST',
        });
        const isFavorite = res?.isFavorite;
        setFavoriteFarmerIds((previous) => {
          if (isFavorite === false) {
            return previous.filter((id) => id !== farmerId);
          }
          return previous.includes(farmerId) ? previous : [...previous, farmerId];
        });
        return isFavorite !== false;
      } catch (err: any) {
        console.warn('[Account] The cultivator could not be marked:', err?.message);
        await refresh();
        return false;
      }
    },
    [refresh]
  );

  const markRead = useCallback(
    async (notificationId: string) => {
      try {
        await fetchApi(`/notifications/${notificationId}/read`, { method: 'PATCH' });
        setNotifications((previous) =>
          previous.map((item: any) =>
            item?.id === notificationId ? { ...item, isRead: true } : item
          )
        );
        setUnreadCount((previous) =>
          previous === null ? null : Math.max(0, previous - 1)
        );
      } catch (err: any) {
        console.warn('[Account] The notification could not be marked:', err?.message);
        // The state is read again from the shared backend, and the caller
        // is told that the platform refused it — a notice that was not
        // marked must not look marked.
        await refresh();
        throw err;
      }
    },
    [refresh]
  );

  const markAllRead = useCallback(async () => {
    try {
      await fetchApi('/notifications/read-all', { method: 'PATCH' });
      setNotifications((previous) => previous.map((item: any) => ({ ...item, isRead: true })));
      setUnreadCount(0);
    } catch (err: any) {
      console.warn('[Account] The notifications could not be marked:', err?.message);
      await refresh();
      throw err;
    }
  }, [refresh]);

  const value = useMemo<AccountContextValue>(
    () => ({
      favoriteProductIds,
      favoriteFarmerIds,
      favoriteProducts,
      favoriteFarmers,
      notifications,
      unreadCount,
      loading,
      canFavorite,
      refresh,
      toggleProduct,
      toggleFarmer,
      markRead,
      markAllRead,
    }),
    [
      favoriteProductIds,
      favoriteFarmerIds,
      favoriteProducts,
      favoriteFarmers,
      notifications,
      unreadCount,
      loading,
      canFavorite,
      refresh,
      toggleProduct,
      toggleFarmer,
      markRead,
      markAllRead,
    ]
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
};

export function useAccount(): AccountContextValue {
  const context = useContext(AccountContext);
  if (!context) {
    throw new Error('useAccount must be used within an AccountProvider');
  }
  return context;
}

export default AccountProvider;
