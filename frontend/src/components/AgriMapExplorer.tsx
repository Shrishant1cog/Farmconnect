'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { CheckSquare, Square, ArrowRight, Loader2, AlertCircle, Building2, Sprout } from 'lucide-react';
import { fetchApi } from '../lib/api';
import { localizedName } from '../lib/localized';
import { useI18n } from '../hooks/useI18n';

interface FilterState {
  apmc: boolean;
  vendors: boolean;
  trading: boolean;
  farmers: boolean;
  all: boolean;
}

/** A published APMC benchmark of the shared backend. */
interface ApmcRate {
  id: string;
  commodity: string;
  commodityNameKn?: string | null;
  commodityNameHi?: string | null;
  state: string;
  district: string;
  marketCenter: string;
  modalPrice: number;
}

/** A live listing of the shared backend. */
interface Listing {
  id: string;
  title: string;
  cropName?: string | null;
  variety?: string | null;
  farmerPrice: number;
  priceUnit?: string | null;
  location?: string | null;
}

/**
 * The crop layers of the buy page.
 *
 * Every node is read from the **shared backend**: the APMC layer shows the
 * market yards that really published a benchmark and the farmer layer shows
 * the live listings. Nothing is simulated — a layer without a published
 * dataset says so instead of showing an invented node.
 */
export default function AgriMapExplorer({
  onSelectHarvestLocation,
}: {
  onSelectHarvestLocation: (item: any) => void;
}) {
  const { t, locale, formatCurrency } = useI18n();

  const [filters, setFilters] = useState<FilterState>({
    apmc: true,
    vendors: true,
    trading: false,
    farmers: true,
    all: false,
  });

  const [rates, setRates] = useState<ApmcRate[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        // The published benchmarks and the live catalogue come from the same
        // shared backend that serves the Android app.
        const [ratesResponse, productsResponse] = await Promise.all([
          fetchApi('/apmc/rates'),
          fetchApi('/products'),
        ]);

        if (cancelled) return;

        const rateRows = ratesResponse?.data || ratesResponse?.rates || [];
        const productRows = productsResponse?.data || productsResponse?.products || [];

        setRates(Array.isArray(rateRows) ? rateRows : []);
        setListings(Array.isArray(productRows) ? productRows : []);
      } catch {
        if (!cancelled) setError(t('misc.agriMap.loadError'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const toggleFilter = (key: keyof FilterState) => {
    if (key === 'all') {
      const nextVal = !filters.all;
      setFilters({ apmc: nextVal, vendors: nextVal, trading: nextVal, farmers: nextVal, all: nextVal });
    } else {
      setFilters((prev) => {
        const updated = { ...prev, [key]: !prev[key] };
        updated.all = updated.apmc && updated.vendors && updated.trading && updated.farmers;
        return updated;
      });
    }
  };

  /** One node per market yard that really published a benchmark. */
  const apmcNodes = useMemo(() => {
    const yards = new Map<string, ApmcRate>();

    for (const rate of rates) {
      if (!rate.marketCenter) continue;
      const existing = yards.get(rate.marketCenter);
      // The yard with the most commodities is the most representative node.
      if (!existing) {
        yards.set(rate.marketCenter, rate);
        continue;
      }
    }

    return Array.from(yards.values()).map((rate) => ({
      id: `apmc-${rate.id}`,
      name: rate.marketCenter,
      type: 'apmc',
      lat: null,
      lon: null,
      commodity: localizedName(
        {
          name: rate.commodity,
          nameKn: rate.commodityNameKn,
          nameHi: rate.commodityNameHi,
        },
        locale,
      ),
      modalPrice: rate.modalPrice,
      district: rate.district,
      state: rate.state,
    }));
  }, [rates, locale]);

  /** One node per live listing. */
  const farmerNodes = useMemo(
    () =>
      listings.map((listing) => ({
        id: `lot-${listing.id}`,
        name: listing.cropName || listing.title,
        type: 'farmers',
        lat: null,
        lon: null,
        produce: listing.cropName || listing.title,
        variety: listing.variety || '',
        price: listing.farmerPrice,
        priceUnit: listing.priceUnit || 'PER_KG',
        location: listing.location || '',
        raw: listing,
      })),
    [listings],
  );

  const typeLabels: Record<string, string> = {
    farmers: t('misc.map.farmers'),
    apmc: t('misc.map.apmcMandis'),
    trading: t('misc.map.tradingHubs'),
    vendors: t('misc.map.retailVendors'),
  };

  const visibleApmc = filters.all || filters.apmc ? apmcNodes : [];
  const visibleFarmers = filters.all || filters.farmers ? farmerNodes : [];
  // The backend publishes neither trading hubs nor retail vendors, so those
  // layers stay empty instead of showing invented places.
  const unsupportedLayers = [
    filters.all || filters.trading ? t('misc.map.tradingHubs') : null,
    filters.all || filters.vendors ? t('misc.map.retailVendors') : null,
  ].filter(Boolean) as string[];

  const isEmpty =
    !loading && visibleApmc.length === 0 && visibleFarmers.length === 0 && unsupportedLayers.length === 0;

  return (
    <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-black text-stone-900 tracking-tight">{t('misc.agriMap.title')}</h2>
        <p className="text-xs text-stone-500 mt-0.5">{t('misc.agriMap.body')}</p>
      </div>

      {/* FILTER BRACKETS / CHECKBOX BAR */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-stone-50 rounded-2xl border border-stone-200 mb-4">
        <span className="text-xs font-bold text-stone-600 uppercase tracking-wider mr-1">
          {t('misc.agriMap.layerVisibility')}
        </span>

        <button type="button" onClick={() => toggleFilter('apmc')} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-stone-300 rounded-xl text-xs font-bold text-stone-800 hover:border-emerald-600 transition-colors">
          {filters.apmc ? <CheckSquare className="w-4 h-4 text-emerald-700" /> : <Square className="w-4 h-4 text-stone-400" />}
          [ {t('misc.map.apmcMandis')} ]
        </button>

        <button type="button" onClick={() => toggleFilter('vendors')} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-stone-300 rounded-xl text-xs font-bold text-stone-800 hover:border-emerald-600 transition-colors">
          {filters.vendors ? <CheckSquare className="w-4 h-4 text-emerald-700" /> : <Square className="w-4 h-4 text-stone-400" />}
          [ {t('misc.map.retailVendors')} ]
        </button>

        <button type="button" onClick={() => toggleFilter('trading')} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-stone-300 rounded-xl text-xs font-bold text-stone-800 hover:border-emerald-600 transition-colors">
          {filters.trading ? <CheckSquare className="w-4 h-4 text-emerald-700" /> : <Square className="w-4 h-4 text-stone-400" />}
          [ {t('misc.map.tradingHubs')} ]
        </button>

        <button type="button" onClick={() => toggleFilter('farmers')} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-stone-300 rounded-xl text-xs font-bold text-stone-800 hover:border-emerald-600 transition-colors">
          {filters.farmers ? <CheckSquare className="w-4 h-4 text-emerald-700" /> : <Square className="w-4 h-4 text-stone-400" />}
          [ {t('misc.map.farmers')} ]
        </button>

        <button type="button" onClick={() => toggleFilter('all')} className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-800 text-white rounded-xl text-xs font-black hover:bg-emerald-900 transition-colors ml-auto">
          {filters.all ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
          {t('misc.agriMap.includeAll')}
        </button>
      </div>

      {/* MAP STAGE CONTAINER */}
      <div className="relative w-full h-80 bg-stone-100 rounded-2xl border border-stone-300 overflow-hidden flex items-center justify-center p-4">
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#059669_1px,transparent_1px)] [background-size:16px_16px]" />

        {loading ? (
          <div className="relative z-10 flex flex-col items-center gap-2 text-stone-500">
            <Loader2 className="w-7 h-7 animate-spin text-emerald-700" />
            <span className="text-xs font-bold uppercase tracking-wider">
              {t('misc.agriMap.loading')}
            </span>
          </div>
        ) : error ? (
          <div className="relative z-10 flex flex-col items-center gap-2 text-center px-4">
            <AlertCircle className="w-7 h-7 text-rose-600" />
            <span className="text-xs font-bold text-stone-700">{error}</span>
            <span className="text-[11px] text-stone-500">{t('misc.agriMap.loadErrorHint')}</span>
          </div>
        ) : isEmpty ? (
          <div className="relative z-10 flex flex-col items-center gap-2 text-center px-4">
            <AlertCircle className="w-7 h-7 text-amber-600" />
            <span className="text-xs font-bold text-stone-700">{t('misc.agriMap.emptyTitle')}</span>
            <span className="text-[11px] text-stone-500">{t('misc.agriMap.emptyBody')}</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl relative z-10 overflow-y-auto max-h-72">
            {visibleApmc.map((node) => (
              <div
                key={node.id}
                onClick={() => onSelectHarvestLocation(node)}
                className="p-3 bg-white/90 backdrop-blur rounded-xl border border-stone-200 shadow-sm cursor-pointer hover:border-emerald-600 hover:shadow-md transition-all group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    {typeLabels[node.type]}
                  </span>
                  <span className="text-xs font-bold text-stone-500">
                    {node.district}, {node.state}
                  </span>
                </div>
                <p className="text-sm font-bold text-stone-900 mt-1.5 group-hover:text-emerald-800">
                  {node.name}
                </p>
                <div className="mt-2 flex items-center justify-between text-xs font-medium text-stone-600 gap-2">
                  <span>
                    {node.commodity} — {formatCurrency(node.modalPrice)} {t('misc.unit.quintal')}
                  </span>
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    {t('misc.agriMap.select')} <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}

            {visibleFarmers.map((node) => (
              <div
                key={node.id}
                onClick={() => onSelectHarvestLocation(node.raw)}
                className="p-3 bg-white/90 backdrop-blur rounded-xl border border-stone-200 shadow-sm cursor-pointer hover:border-emerald-600 hover:shadow-md transition-all group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 flex items-center gap-1">
                    <Sprout className="w-3 h-3" />
                    {typeLabels[node.type]}
                  </span>
                  <span className="text-xs font-bold text-stone-500">{node.location}</span>
                </div>
                <p className="text-sm font-bold text-stone-900 mt-1.5 group-hover:text-emerald-800">
                  {node.produce}
                </p>
                <div className="mt-2 flex items-center justify-between text-xs font-medium text-stone-600 gap-2">
                  <span>
                    {formatCurrency(node.price)}/{(node.priceUnit || 'PER_KG').replace(/^PER_/, '').toLowerCase()}
                    {node.variety ? ` · ${node.variety}` : ''}
                  </span>
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    {t('misc.agriMap.select')} <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}

            {unsupportedLayers.map((layer) => (
              <div
                key={layer}
                className="p-3 bg-white/60 backdrop-blur rounded-xl border border-dashed border-stone-300 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-stone-200 text-stone-600">
                    {layer}
                  </span>
                </div>
                <p className="text-xs text-stone-500 mt-2">{t('misc.agriMap.layerNotPublished')}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
