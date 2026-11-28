'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart, RefreshCw, Sprout, MapPin, Loader2, AlertCircle, Scale } from 'lucide-react';
import { useAccount } from '../../../context/AccountContext';
import { useI18n } from '../../../hooks/useI18n';

/**
 * The favourites of the buyer.
 *
 * The shared backend owns the list (`GET /api/favorites`). The page
 * shows exactly what the backend answers — a lot that was removed on the
 * phone disappears here as well, and an answer that could not be read
 * produces an honest error instead of an empty list.
 *
 * The state comes from the shared `AccountContext`, so the list of this
 * page and the badge of the navbar are read from the same answer and can
 * never disagree.
 */
export default function ConsumerFavoritesPage() {
  const { t, formatNumber, formatCurrency } = useI18n();
  const {
    favoriteProducts: products,
    favoriteFarmers: farmers,
    loading,
    refresh,
  } = useAccount();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadFavorites = useCallback(async () => {
    setErrorMessage(null);
    try {
      await refresh();
    } catch (err: any) {
      console.warn('Failed to load favourites:', err?.message);
      setErrorMessage(err?.message || t('consumer.favorites.loadError'));
    }
  }, [refresh, t]);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const isEmpty = products.length === 0 && farmers.length === 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-stone-900 tracking-tight flex items-center gap-3">
            <Heart className="w-7 h-7 text-rose-600" fill="currentColor" />
            {t('consumer.favorites.title')}
          </h1>
          <p className="text-stone-600 text-sm mt-1">{t('consumer.favorites.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={loadFavorites}
          className="inline-flex items-center gap-2 self-start px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> {t('consumer.favorites.refresh')}
        </button>
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
          {t('consumer.favorites.loading')}
        </div>
      ) : isEmpty ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-stone-200">
          <Heart className="w-10 h-10 text-stone-300 mx-auto mb-3" />
          <p className="font-black text-stone-800">{t('consumer.favorites.emptyTitle')}</p>
          <p className="text-sm text-stone-500 mt-1 max-w-md mx-auto">
            {t('consumer.favorites.emptyBody')}
          </p>
          <Link
            href="/consumer/explore"
            className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 rounded-xl bg-emerald-700 text-white text-xs font-black uppercase tracking-wider"
          >
            <Sprout className="w-3.5 h-3.5" /> {t('consumer.favorites.exploreMarketplace')}
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {products.length > 0 && (
            <section>
              <h2 className="text-lg font-black text-stone-900 mb-3">
                {t('consumer.favorites.listingsTitle')}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map((entry: any) => {
                  const product = entry?.product || entry;
                  return (
                    <Link
                      key={entry?.id || product?.id}
                      href={`/products/${product?.id}`}
                      className="bg-white rounded-3xl border border-stone-200 p-5 flex flex-col gap-2 hover:border-emerald-300 hover:shadow-md transition-all"
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                        {product?.farmer?.farmName || t('consumer.explore.karnatakaCultivator')}
                      </span>
                      <h3 className="font-black text-stone-900 leading-snug">{product?.title}</h3>
                      <div className="flex items-center gap-1 text-[11px] text-stone-400 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        <span className="truncate">{product?.location || 'Karnataka'}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-stone-500 font-semibold">
                        <Scale className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        {t('consumer.explore.quantityAvailable', {
                          quantity: formatNumber(Number(product?.quantityAvailable) || 0),
                          unit: product?.quantityUnit || 'KG',
                        })}
                      </div>
                      <span className="text-lg font-black text-emerald-800">
                        {formatCurrency(Number(product?.farmerPrice) || 0, {
                          maximumFractionDigits: 0,
                        })}
                        <span className="text-xs font-normal text-stone-500">
                          {' '}
                          / {t('common.kg')}
                        </span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {farmers.length > 0 && (
            <section>
              <h2 className="text-lg font-black text-stone-900 mb-3">
                {t('consumer.favorites.farmersTitle')}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {farmers.map((entry: any) => {
                  const farmer = entry?.farmer || entry;
                  const user = farmer?.user || {};
                  return (
                    <Link
                      key={entry?.id || farmer?.id}
                      href={`/consumer/farmer/${farmer?.id}`}
                      className="bg-white rounded-3xl border border-stone-200 p-5 flex flex-col gap-2 hover:border-emerald-300 hover:shadow-md transition-all"
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                        {farmer?.farmName || t('consumer.explore.genericFarm')}
                      </span>
                      <h3 className="font-black text-stone-900 leading-snug">
                        {user?.name || farmer?.farmName || t('consumer.explore.karnatakaCultivator')}
                      </h3>
                      <div className="flex items-center gap-1 text-[11px] text-stone-400 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        <span className="truncate">
                          {farmer?.district || 'Karnataka'}
                        </span>
                      </div>
                      {Array.isArray(farmer?.products) && farmer.products.length > 0 && (
                        <span className="text-[11px] font-bold text-stone-500">
                          {t('consumer.favorites.activeLots', {
                            count: formatNumber(farmer.products.length),
                          })}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
