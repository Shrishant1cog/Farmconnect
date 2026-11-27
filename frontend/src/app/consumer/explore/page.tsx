'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Search,
  Sprout,
  MapPin,
  Package,
  ShoppingCart,
  Loader2,
  Sparkles,
  Check,
  RefreshCw,
  ShieldCheck,
  Scale,
} from 'lucide-react';
import { useCart } from '../../../context/CartContext';
import { useModal } from '../../../context/ModalContext';
import { fetchApi } from '../../../lib/api';
import { localizedName, LocalizedName } from '../../../lib/localized';
import { useI18n } from '../../../hooks/useI18n';

interface CatalogueCategory extends LocalizedName {
  id: string;
  name: string;
  slug: string;
  description?: string;
  productCount?: number;
}

export default function ConsumerExplorePage() {
  const { t, locale, formatNumber, formatCurrency } = useI18n();
  const { addToCart, items = [], clearCart } = useCart() as any;
  const { confirm, alert } = useModal();

  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<CatalogueCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [organicOnly, setOrganicOnly] = useState(false);
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const loadCategories = useCallback(async () => {
    try {
      const res = await fetchApi('/catalog/categories');
      const data = res?.data || res?.categories || (Array.isArray(res) ? res : []);
      if (Array.isArray(data)) {
        setCategories(
          data
            .filter((category: CatalogueCategory) => category?.slug && category?.name)
            .map((category: CatalogueCategory) => ({
              ...category,
              slug: String(category.slug),
            }))
        );
      }
    } catch {
      setCategories([]);
    }
  }, []);

  const fetchCrops = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);

    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    if (selectedCategory !== 'ALL') params.set('category', selectedCategory);
    if (organicOnly) params.set('isOrganic', 'true');

    try {
      const query = params.toString();
      const res = await fetchApi(`/products${query ? `?${query}` : ''}`);
      const data = res?.data || res?.products || (Array.isArray(res) ? res : []);
      if (requestId !== requestIdRef.current) return;

      // The marketplace shows the real shared catalogue only. When the API
      // returns nothing the empty state is shown — never a mock listing.
      setLoadError(null);
      setProducts(Array.isArray(data) ? data : []);
    } catch (error: any) {
      if (requestId === requestIdRef.current) {
        setLoadError(error?.message || t('consumer.explore.loadError'));
        setProducts([]);
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [organicOnly, search, selectedCategory, t]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    const initialSearch = new URLSearchParams(window.location.search).get('search');
    if (initialSearch) setSearch(initialSearch);
  }, []);

  useEffect(() => {
    fetchCrops();
  }, [fetchCrops]);

  const refreshAll = async () => {
    await Promise.all([loadCategories(), fetchCrops()]);
  };

  const handleAddToCart = async (product: any) => {
    const targetFarmerId = product.farmerId || product.farmer?.id || 'farmer_generic';
    const targetFarmName =
      product.farmer?.farmName || product.farmName || t('consumer.explore.genericFarm');

    if (items && items.length > 0) {
      const activeFarmerId = items[0].farmerId;
      const activeFarmName = items[0].farmName || t('consumer.explore.currentFarm');

      if (activeFarmerId && activeFarmerId !== targetFarmerId) {
        const replaceConfirmed = await confirm({
          title: t('consumer.explore.replaceCartTitle'),
          message: t('consumer.explore.replaceCartBody', {
            farm: activeFarmName,
            targetFarm: targetFarmName,
          }),
          confirmText: t('consumer.explore.replaceAndAdd'),
          cancelText: t('consumer.explore.keepExistingCart'),
          type: 'cart',
        });

        if (!replaceConfirmed) return;

        if (typeof clearCart === 'function') clearCart();
      }
    }

    const payload = {
      id: product.id,
      productId: product.id,
      title: product.title,
      farmerId: targetFarmerId,
      farmName: targetFarmName,
      // The real listed price and the real available quantity — a fallback
      // price or stock would be a fabricated number.
      farmerPrice: Number(product.farmerPrice),
      priceUnit: product.priceUnit || 'PER_KG',
      quantityUnit: product.quantityUnit || 'KG',
      availableStock: Number(product.quantityAvailable),
      imageUrl: product.imageUrl,
    };

    const success = addToCart(payload, 10);

    if (success !== false) {
      setAddedIds((prev) => ({ ...prev, [product.id]: true }));
      setTimeout(() => {
        setAddedIds((prev) => ({ ...prev, [product.id]: false }));
      }, 1500);
    } else {
      await alert({
        title: t('consumer.explore.stockLimitTitle'),
        message: t('consumer.explore.stockLimitBody'),
        type: 'warning',
      });
    }
  };

  const filtered = useMemo(() => {
    // The **search** is applied by the shared backend — it knows the crop
    // catalogue, so a Kannada or Hindi term finds a listing that stores the
    // canonical English crop name. Filtering the answer again in the browser
    // would silently drop those rows, so only the two local filters are
    // applied here.
    return products.filter((product) => {
      const matchesOrganic = !organicOnly || product.isOrganic;
      const matchesCategory =
        selectedCategory === 'ALL' ||
        product.category?.slug === selectedCategory ||
        product.category?.name?.toLowerCase() === selectedCategory.toLowerCase();

      return matchesOrganic && matchesCategory;
    });
  }, [organicOnly, products, selectedCategory]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-in fade-in duration-200">
      <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-950 border border-emerald-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
              <Sprout className="w-3.5 h-3.5 text-emerald-700" /> {t('consumer.explore.directMarketplace')}
            </span>
            <span className="px-3 py-1 rounded-full bg-stone-100 text-stone-700 border border-stone-200 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> {t('consumer.explore.verifiedCultivators')}
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-stone-900 tracking-tight">
            {t('consumer.explore.heading')}
          </h1>
          <p className="text-stone-500 text-xs sm:text-sm mt-1 max-w-2xl">
            {t('consumer.explore.subtitle')}
          </p>
        </div>

        <button
          onClick={refreshAll}
          className="p-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-2xl transition-all active:scale-95 self-start md:self-auto border border-stone-200"
          title={t('consumer.explore.refreshProduce')}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            aria-label={t('consumer.explore.searchPlaceholder')}
            placeholder={t('consumer.explore.searchPlaceholder')}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-stone-50 rounded-xl text-xs font-semibold text-stone-900 border border-stone-200 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-600 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={() => setOrganicOnly((prev) => !prev)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
              organicOnly
                ? 'bg-emerald-800 text-white border-emerald-900 shadow-xs'
                : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            {t('consumer.explore.organicOnly')}
          </button>
        </div>
      </div>

      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-stone-200 shadow-xs space-y-2.5">
        <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 block">
          {t('consumer.explore.categoriesLabel')}
        </span>
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedCategory('ALL')}
            className={`shrink-0 px-3.5 py-2 rounded-full text-xs font-bold transition-all border ${
              selectedCategory === 'ALL'
                ? 'bg-emerald-800 text-white border-emerald-900'
                : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
            }`}
          >
            {t('consumer.explore.allCategories')}
          </button>
          {categories.map((category) => (
            <button
              key={category.id || category.slug}
              type="button"
              onClick={() => setSelectedCategory(category.slug)}
              className={`shrink-0 px-3.5 py-2 rounded-full text-xs font-bold transition-all border ${
                selectedCategory === category.slug
                  ? 'bg-emerald-800 text-white border-emerald-900'
                  : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
              }`}
            >
              {localizedName(category, locale)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="min-h-[45vh] bg-white rounded-3xl border border-stone-200 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-700" />
          <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">
            {t('consumer.explore.loading')}
          </span>
        </div>
      ) : loadError ? (
        <div className="bg-white rounded-3xl border border-red-200 p-12 text-center max-w-md mx-auto space-y-3">
          <Package className="w-12 h-12 text-red-200 mx-auto" />
          <h3 className="text-base font-black text-stone-900">{t('consumer.explore.errorTitle')}</h3>
          <p className="text-xs text-stone-500">{loadError}</p>
          <button
            type="button"
            onClick={() => fetchCrops()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-black uppercase tracking-wider transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {t('consumer.explore.retry')}
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center max-w-md mx-auto space-y-3">
          <Package className="w-12 h-12 text-stone-300 mx-auto" />
          <h3 className="text-base font-black text-stone-900">{t('consumer.explore.noListings')}</h3>
          <p className="text-xs text-stone-500">
            {t('consumer.explore.noListingsBody', { search: search.trim() })}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filtered.map((product) => {
            const isAdded = addedIds[product.id];
            const farmName =
              product.farmer?.farmName ||
              product.farmName ||
              t('consumer.explore.karnatakaCultivator');
            const cropAndVariety = product.cropName ? (
              <>
                {t('common.crop')}: {product.cropName}
                {product.variety && (
                  <> · {t('common.variety')}: {product.variety}</>
                )}
              </>
            ) : null;

            return (
              <div
                key={product.id}
                className="bg-white rounded-3xl border border-stone-200/90 shadow-xs hover:border-emerald-300 hover:shadow-lg transition-all overflow-hidden flex flex-col justify-between group"
              >
                <div>
                  <div className="h-48 w-full bg-stone-100 relative overflow-hidden">
                    <img
                      src={product.imageUrl || 'https://images.unsplash.com/photo-1597362925123-77861d3fbac7?auto=format&fit=crop&w=800&q=80'}
                      alt={product.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={(event: any) => {
                        event.target.src = 'https://images.unsplash.com/photo-1597362925123-77861d3fbac7?auto=format&fit=crop&w=800&q=80';
                      }}
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-stone-950/40 via-transparent to-transparent pointer-events-none" />

                    {product.isOrganic && (
                      <span className="absolute top-3 left-3 bg-emerald-700/95 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-xs flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                        {t('consumer.explore.organic')}
                      </span>
                    )}

                    <span className="absolute bottom-3 left-3 bg-stone-900/80 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1">
                      <Scale className="w-3 h-3 text-emerald-400" />
                      {t('consumer.explore.quantityAvailable', {
                        quantity: formatNumber(Number(product.quantityAvailable) || 0),
                        unit: product.quantityUnit || 'KG',
                      })}
                    </span>
                  </div>

                  <div className="p-5 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                      {farmName}
                    </span>
                    <h3 className="text-base font-black text-stone-900 tracking-tight leading-snug">
                      {product.title}
                    </h3>
                    {cropAndVariety && (
                      <p className="text-[11px] font-semibold text-emerald-700 leading-relaxed">
                        {cropAndVariety}
                      </p>
                    )}
                    <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed">
                      {product.description}
                    </p>
                    <div className="flex items-center gap-1 text-[11px] text-stone-400 font-medium pt-1">
                      <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      <span className="truncate">{product.location || 'Karnataka'}</span>
                    </div>
                  </div>
                </div>

                <div className="p-5 pt-0">
                  <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                        {t('consumer.explore.directFarmRate')}
                      </span>
                      <span className="text-lg font-black text-emerald-800 block leading-tight">
                        {formatCurrency(Number(product.farmerPrice) || 0, { maximumFractionDigits: 0 })}
                        <span className="text-xs font-normal text-stone-500"> / {t('common.kg')}</span>
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAddToCart(product)}
                      className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 active:scale-95 shadow-sm ${
                        isAdded
                          ? 'bg-emerald-700 text-white shadow-emerald-700/20'
                          : 'bg-emerald-800 hover:bg-emerald-900 text-white shadow-emerald-800/20'
                      }`}
                    >
                      {isAdded ? (
                        <>
                          <Check className="w-3.5 h-3.5" /> {t('consumer.explore.added')}
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="w-3.5 h-3.5" /> {t('consumer.explore.addLot')}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
