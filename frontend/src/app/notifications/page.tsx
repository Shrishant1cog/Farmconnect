'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Bell, CheckCheck, RefreshCw, Loader2, AlertCircle } from 'lucide-react';
import { fetchApi } from '../../lib/api';
import { extractNotificationList, extractUnreadCount } from '../../lib/account';
import { useI18n } from '../../hooks/useI18n';

/**
 * The inbox of the account.
 *
 * The shared backend owns the notices (`GET /api/notifications`) and
 * reads them as well (`PATCH /api/notifications/:id/read`,
 * `PATCH /api/notifications/read-all`). The page shows exactly what the
 * backend answers and never claims that a notice was read when the
 * platform refused it.
 */
export default function NotificationsPage() {
  const { t, formatDate } = useI18n();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetchApi('/notifications');
      setNotifications(extractNotificationList(res));
      setUnreadCount(extractUnreadCount(res));
    } catch (err: any) {
      console.warn('Failed to load notifications:', err?.message);
      setErrorMessage(err?.message || t('misc.notifications.loadError'));
      setNotifications([]);
      setUnreadCount(null);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const markRead = async (notification: any) => {
    const id = notification?.id;
    if (!id || notification?.isRead) return;
    setBusyId(id);
    try {
      await fetchApi(`/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications((previous) =>
        previous.map((item: any) => (item?.id === id ? { ...item, isRead: true } : item))
      );
      setUnreadCount((previous) =>
        previous === null ? null : Math.max(0, previous - 1)
      );
    } catch (err: any) {
      console.warn('Failed to mark the notification as read:', err?.message);
      setErrorMessage(err?.message || t('misc.notifications.markError'));
    } finally {
      setBusyId(null);
    }
  };

  const markAllRead = async () => {
    try {
      await fetchApi('/notifications/read-all', { method: 'PATCH' });
      setNotifications((previous) => previous.map((item: any) => ({ ...item, isRead: true })));
      setUnreadCount(0);
    } catch (err: any) {
      console.warn('Failed to mark the notifications as read:', err?.message);
      setErrorMessage(err?.message || t('misc.notifications.markError'));
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-stone-900 tracking-tight flex items-center gap-3">
            <Bell className="w-7 h-7 text-emerald-700" />
            {t('misc.notifications.title')}
          </h1>
          <p className="text-stone-600 text-sm mt-1">
            {unreadCount === null
              ? t('misc.notifications.subtitle')
              : t('misc.notifications.subtitleWithCount', { count: unreadCount })}
          </p>
        </div>
        <div className="flex items-center gap-2 self-start">
          <button
            type="button"
            onClick={markAllRead}
            disabled={notifications.length === 0}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition-colors disabled:opacity-50"
          >
            <CheckCheck className="w-3.5 h-3.5" /> {t('misc.notifications.markAllRead')}
          </button>
          <button
            type="button"
            onClick={loadNotifications}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> {t('misc.notifications.refresh')}
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm font-semibold">{errorMessage}</p>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-stone-500 font-bold text-sm">
          <Loader2 className="w-7 h-7 animate-spin mx-auto mb-3" />
          {t('misc.notifications.loading')}
        </div>
      ) : notifications.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-stone-200">
          <Bell className="w-10 h-10 text-stone-300 mx-auto mb-3" />
          <p className="font-black text-stone-800">{t('misc.notifications.emptyTitle')}</p>
          <p className="text-sm text-stone-500 mt-1">{t('misc.notifications.emptyBody')}</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {notifications.map((notification: any) => {
            const isRead = Boolean(notification?.isRead);
            return (
              <li
                key={notification?.id}
                className={`bg-white rounded-2xl border p-4 flex items-start gap-3 transition-colors ${
                  isRead ? 'border-stone-200' : 'border-emerald-200 bg-emerald-50/40'
                }`}
              >
                <span
                  className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
                    isRead ? 'bg-stone-300' : 'bg-emerald-600'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-black text-stone-900 text-sm">
                    {notification?.title || t('misc.notifications.untitled')}
                  </p>
                  {notification?.message && (
                    <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                      {notification.message}
                    </p>
                  )}
                  {notification?.createdAt && (
                    <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mt-2">
                      {formatDate(notification.createdAt)}
                    </p>
                  )}
                </div>
                {!isRead && (
                  <button
                    type="button"
                    onClick={() => markRead(notification)}
                    disabled={busyId === notification?.id}
                    className="self-center px-3 py-1.5 rounded-lg bg-white border border-stone-200 text-stone-600 text-[10px] font-black uppercase tracking-wider hover:border-emerald-400 hover:text-emerald-800 transition-colors disabled:opacity-50"
                  >
                    {t('misc.notifications.markRead')}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
