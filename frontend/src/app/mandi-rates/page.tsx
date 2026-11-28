'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  Search,
  Building2,
  Sparkles,
  ArrowRight,
  Info,
  Download,
  CheckCircle2,
  ChevronRight,
  Scale,
  X,
  Layers,
  Loader2,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import { fetchApi } from '../../lib/api';
import { localizedName, LocalizedName } from '../../lib/localized';
import { useI18n } from '../../hooks/useI18n';

/**
 * A published APMC benchmark of the **shared backend**.
 *
 * Every field is stored in the shared PostgreSQL database — nothing on this
 * page is invented. The website and the Android app read the same endpoint,
 * so both clients always show the same (possibly empty) set of benchmarks.
 */
export interface MandiRecord {
  id: string;
  commodity: string;
  commodityNameKn?: string | null;
  commodityNameHi?: string | null;
  category?: string | null;
  categoryName?: string | null;
  categoryNameKn?: string | null;
  categoryNameHi?: string | null;
  state: string;
  district: string;
  marketCenter: string;
  /** ₹ per quintal (100 kg) — the unit the market publishes. */
  minPrice: number;
  maxPrice: number;
  modalPrice: number;
  updatedAt?: string | null;
}

type SortField = 'modalPrice' | 'updatedAt';
type SortOrder = 'asc' | 'desc';

export default function MandiRatesPage() {
  const { t, locale, formatNumber, formatCurrency, formatDateTime } = useI18n();

  // The benchmarks come from the shared backend — never from a bundled list.
  const [records, setRecords] = useState<MandiRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [selectedState, setSelectedState] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [sortField, setSortField] = useState<SortField>('modalPrice');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Unit Mode: Quintal (100 kg) or KG (1 kg)
  const [priceUnitMode, setPriceUnitMode] = useState<'QUINTAL' | 'KG'>('KG');

  // Scope Filter: All India vs Karnataka Yards
  const [scopeFilter, setScopeFilter] = useState<'ALL' | 'KARNATAKA'>('ALL');

  // Inspection Modal Drawer
  const [inspectRecord, setInspectRecord] = useState<MandiRecord | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetchApi('/apmc/rates');
        const data = response?.data || response?.rates || [];

        if (cancelled) return;

        if (Array.isArray(data)) {
          setRecords(data as MandiRecord[]);
        } else {
          setRecords([]);
        }
      } catch {
        if (!cancelled) {
          setError(t('misc.mandi.ratesLoadError'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [t]);

  /** The distinct states that actually published a benchmark. */
  const states = useMemo(() => {
    const list = Array.from(new Set(records.map((item) => item.state).filter(Boolean)));
    return ['ALL', ...list.sort()];
  }, [records]);

  /** The distinct crop categories of the published benchmarks. */
  const categories = useMemo(() => {
    const list = Array.from(
      new Set(
        records
          .map((item) => item.categoryName || item.category || '')
          .filter(Boolean),
      ),
    );
    return ['ALL', ...list.sort()];
  }, [records]);

  /** The localised display name of a category. */
  const categoryLabel = (record: MandiRecord): string => {
    const label = localizedName(
      {
        name: record.categoryName || record.category || '',
        nameKn: record.categoryNameKn,
        nameHi: record.categoryNameHi,
      },
      locale,
    );
    return label || t('misc.mandi.noCategory');
  };

  /** The localised display name of a commodity. */
  const commodityLabel = (record: MandiRecord): string =>
    localizedName(
      {
        name: record.commodity,
        nameKn: record.commodityNameKn,
        nameHi: record.commodityNameHi,
      },
      locale,
    ) || record.commodity;

  // Filter and Sort Pipeline
  const filteredData = useMemo(() => {
    const targetQuery = search.trim().toLowerCase();

    return records
      .filter((item) => {
        const matchSearch =
          !targetQuery ||
          item.commodity.toLowerCase().includes(targetQuery) ||
          (item.commodityNameKn || '').toLowerCase().includes(targetQuery) ||
          (item.commodityNameHi || '').toLowerCase().includes(targetQuery) ||
          item.marketCenter.toLowerCase().includes(targetQuery) ||
          item.district.toLowerCase().includes(targetQuery) ||
          item.state.toLowerCase().includes(targetQuery);

        const matchState =
          scopeFilter === 'KARNATAKA'
            ? item.state === 'Karnataka'
            : selectedState === 'ALL' || item.state === selectedState;

        const matchCategory =
          selectedCategory === 'ALL' ||
          (item.categoryName || item.category) === selectedCategory;

        return matchSearch && matchState && matchCategory;
      })
      .sort((a, b) => {
        if (sortField === 'updatedAt') {
          const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
          const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
          return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
        }

        return sortOrder === 'desc'
          ? b.modalPrice - a.modalPrice
          : a.modalPrice - b.modalPrice;
      });
  }, [records, search, selectedState, selectedCategory, sortField, sortOrder, scopeFilter]);

  // Aggregate Market Stats — every number is derived from the real rows.
  const stats = useMemo(() => {
    const yards = new Set(filteredData.map((item) => item.marketCenter).filter(Boolean));
    const stateList = new Set(filteredData.map((item) => item.state).filter(Boolean));
    const highest = filteredData.reduce(
      (max, item) => (item.modalPrice > max ? item.modalPrice : max),
      0,
    );
    const lastUpdated = filteredData.reduce((latest, item) => {
      if (!item.updatedAt) return latest;
      const time = new Date(item.updatedAt).getTime();
      return time > latest ? time : latest;
    }, 0);

    return {
      totalListed: filteredData.length,
      yardCount: yards.size,
      stateCount: stateList.size,
      highestModalPrice: highest,
      lastUpdated: lastUpdated || null,
    };
  }, [filteredData]);

  // Unit Format Helper — the market publishes ₹ per quintal.
  const formatPrice = (valInQuintal: number) => {
    if (priceUnitMode === 'KG') {
      const perKg = valInQuintal / 100;
      return formatCurrency(perKg, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
      });
    }
    return formatCurrency(valInQuintal, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  const getUnitSuffix = () =>
    priceUnitMode === 'KG' ? t('misc.unit.perKg') : t('misc.unit.perQuintal');

  // CSV Exporter — only the stored columns.
  const handleExportCSV = () => {
    const headers = [
      t('misc.mandi.csvCommodity'),
      t('common.category'),
      t('misc.mandi.csvMarketCenter'),
      t('common.district'),
      t('common.state'),
      t('misc.mandi.csvMinPrice'),
      t('misc.mandi.csvMaxPrice'),
      t('misc.mandi.csvModalPrice'),
      t('common.priceUnit'),
      t('misc.mandi.csvUpdatedAt'),
    ];

    const rows = filteredData.map((record) => [
      `"${record.commodity.replace(/"/g, '""')}"`,
      `"${(record.categoryName || '').replace(/"/g, '""')}"`,
      `"${record.marketCenter.replace(/"/g, '""')}"`,
      `"${record.district.replace(/"/g, '""')}"`,
      `"${record.state.replace(/"/g, '""')}"`,
      formatNumber(record.minPrice),
      formatNumber(record.maxPrice),
      formatNumber(record.modalPrice),
      t('misc.unit.quintal'),
      `"${record.updatedAt ? formatDateTime(record.updatedAt) : ''}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute(
      'download',
      `farmconnect_apmc_benchmarks_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /** The honest empty state — no benchmark has been published yet. */
  const emptyState =
    loading || records.length === 0 ? (
      <div className="bg-white rounded-3xl border border-stone-200 shadow-xs px-6 py-16 text-center space-y-3">
        {loading ? (
          <>
            <Loader2 className="w-8 h-8 text-emerald-700 animate-spin mx-auto" />
            <p className="text-base font-bold text-stone-700">{t('misc.mandi.loadingRates')}</p>
          </>
        ) : (
          <>
            <AlertCircle className="w-8 h-8 text-amber-600 mx-auto" />
            <p className="text-base font-bold text-stone-700">{t('misc.mandi.noPublishedRates')}</p>
            <p className="text-xs text-stone-400 max-w-lg mx-auto leading-relaxed">
              {t('misc.mandi.noPublishedRatesHint')}
            </p>
          </>
        )}
      </div>
    ) : (
      <div className="bg-white rounded-3xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50/90 border-b border-stone-200 text-[11px] font-black uppercase text-stone-500 tracking-wider">
                <th className="py-4 px-6">{t('misc.mandi.csvCommodity')}</th>
                <th className="py-4 px-4">{t('misc.mandi.marketYard')}</th>
                <th className="py-4 px-4 text-right">{t('misc.mandi.minMaxBand')}</th>
                <th className="py-4 px-4 text-right">{t('misc.mandi.mandiModalRate')}</th>
                <th className="py-4 px-4 text-right">{t('misc.mandi.lastUpdatedAt')}</th>
                <th className="py-4 px-4 text-center">{t('misc.mandi.inspect')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-xs">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-stone-400 font-semibold space-y-2">
                    <p className="text-base font-bold text-stone-700">
                      {t('misc.mandi.noMatchingRecords')}
                    </p>
                    <p className="text-xs text-stone-400">{t('misc.mandi.noMatchingRecordsHint')}</p>
                  </td>
                </tr>
              ) : (
                filteredData.map((row) => {
                  const min = row.minPrice;
                  const max = row.maxPrice;
                  const modal = row.modalPrice;
                  const spreadPercent =
                    max > min ? Math.round(((modal - min) / (max - min)) * 100) : 50;

                  return (
                    <tr
                      key={row.id}
                      className="hover:bg-stone-50/80 transition-colors group cursor-pointer"
                      onClick={() => setInspectRecord(row)}
                    >
                      {/* Commodity */}
                      <td className="py-4 px-6">
                        <div className="font-black text-stone-900 text-sm group-hover:text-emerald-800 transition-colors">
                          {commodityLabel(row)}
                        </div>
                        {commodityLabel(row) !== row.commodity && (
                          <div className="text-[11px] text-stone-400 font-medium">
                            {row.commodity}
                          </div>
                        )}
                        <div className="text-[11px] text-stone-500 font-medium line-clamp-1">
                          <span className="text-emerald-700 font-bold">{categoryLabel(row)}</span>
                        </div>
                      </td>

                      {/* APMC Market Location */}
                      <td className="py-4 px-4">
                        <div className="font-bold text-stone-800 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          <span>{row.marketCenter}</span>
                        </div>
                        <div className="text-[11px] text-stone-400 font-medium">
                          {row.district}, {row.state}
                        </div>
                      </td>

                      {/* Min - Max Range */}
                      <td className="py-4 px-4 text-right text-stone-600 font-medium whitespace-nowrap">
                        {formatPrice(row.minPrice)} - {formatPrice(row.maxPrice)}
                        <span className="block text-[10px] text-stone-400">{getUnitSuffix()}</span>
                      </td>

                      {/* Mandi Modal Auction Price */}
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <span className="text-base font-black text-stone-900">
                          {formatPrice(row.modalPrice)}
                        </span>
                        <span className="block text-[10px] text-stone-400">{getUnitSuffix()}</span>
                        <span className="block text-[10px] text-stone-400">
                          {t('misc.mandi.modalPosition', { percentage: formatNumber(spreadPercent) })}
                        </span>
                      </td>

                      {/* Last update */}
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <span className="font-bold text-stone-800 text-sm">
                          {row.updatedAt ? formatDateTime(row.updatedAt) : t('misc.mandi.notAvailable')}
                        </span>
                      </td>

                      {/* Inspect Trigger */}
                      <td className="py-4 px-4 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectRecord(row);
                          }}
                          className="p-2 rounded-xl text-stone-400 hover:text-emerald-800 hover:bg-emerald-50 transition-colors"
                          title={t('misc.mandi.inspectTooltip')}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-in fade-in duration-300">

      {/* 1. Header Hero Banner */}
      <div className="bg-white/90 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-stone-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all duration-200">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-950 border border-emerald-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-700" /> {t('misc.mandi.terminalBadge')}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 text-[10px] font-bold">
              {t('misc.mandi.commoditiesCount')}
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-stone-900 tracking-tight">
            {t('misc.mandi.title')}
          </h1>
          <p className="text-stone-500 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
            {t('misc.mandi.body')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={filteredData.length === 0}
            className="px-4 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-2xl flex items-center gap-2 transition-colors border border-stone-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            title={t('misc.mandi.exportTooltip')}
          >
            <Download className="w-4 h-4" /> {t('misc.mandi.exportCsv')}
          </button>

          <Link
            href="/consumer/explore"
            className="px-6 py-3.5 bg-emerald-800 hover:bg-emerald-900 text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/15 transition-all active:scale-95 shrink-0"
          >
            {t('misc.mandi.procureDirect')} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* 2. Key Market KPIs — derived from the published rows */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs transition-transform duration-200 hover:scale-[1.01]">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-stone-500">
              {t('misc.mandi.trackedCommodities')}
            </span>
            <Layers className="w-4 h-4 text-emerald-700" />
          </div>
          <p className="text-3xl font-black text-stone-900">
            {formatNumber(stats.totalListed)} {t('misc.mandi.lots')}
          </p>
          <span className="text-xs text-stone-500 mt-1 block">
            {t('misc.mandi.marketYardsTracked', { count: formatNumber(stats.yardCount) })}
          </span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs transition-transform duration-200 hover:scale-[1.01]">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-stone-500">
              {t('misc.mandi.marketYard')}
            </span>
            <Building2 className="w-4 h-4 text-stone-400" />
          </div>
          <p className="text-3xl font-black text-stone-900">{formatNumber(stats.yardCount)}</p>
          <span className="text-xs text-stone-500 mt-1 block">
            {t('misc.mandi.statesCovered', { count: formatNumber(stats.stateCount) })}
          </span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs transition-transform duration-200 hover:scale-[1.01]">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-stone-500">
              {t('misc.mandi.highestModalPrice')}
            </span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-3xl font-black text-stone-900 truncate">
            {stats.totalListed > 0 ? formatPrice(stats.highestModalPrice) : t('misc.mandi.notAvailable')}
          </p>
          <span className="text-xs text-stone-500 mt-1 block">{getUnitSuffix()}</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs transition-transform duration-200 hover:scale-[1.01]">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-stone-500">
              {t('misc.mandi.lastUpdatedAt')}
            </span>
            <Calendar className="w-4 h-4 text-stone-400" />
          </div>
          <p className="text-lg sm:text-xl font-black text-stone-900 truncate">
            {stats.lastUpdated ? formatDateTime(stats.lastUpdated) : t('misc.mandi.notAvailable')}
          </p>
          <span className="text-xs text-stone-500 mt-1 block">
            {t('misc.mandi.sharedBackendSource')}
          </span>
        </div>

      </div>

      {/* 3. Filter, Scope, and Unit Switcher Bar */}
      <div className="bg-white/95 backdrop-blur-md p-5 rounded-3xl border border-stone-200 shadow-xs space-y-4">

        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">

          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              placeholder={t('misc.mandi.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-stone-50 rounded-2xl text-xs font-semibold text-stone-900 border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-600 transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">

            {/* Scope Selector: Karnataka vs All India */}
            <div className="flex items-center bg-stone-100 p-1 rounded-2xl border border-stone-200 shadow-2xs">
              <button
                type="button"
                onClick={() => setScopeFilter('ALL')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                  scopeFilter === 'ALL'
                    ? 'bg-white text-stone-900 shadow-2xs scale-[1.02]'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                {t('misc.mandi.allIndiaYards')}
              </button>
              <button
                type="button"
                onClick={() => setScopeFilter('KARNATAKA')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                  scopeFilter === 'KARNATAKA'
                    ? 'bg-emerald-800 text-white shadow-2xs scale-[1.02]'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                {t('misc.mandi.karnatakaApmcOnly')}
              </button>
            </div>

            {/* Price Unit Switcher */}
            <div className="flex items-center bg-stone-100 p-1 rounded-2xl border border-stone-200 shadow-2xs">
              <button
                type="button"
                onClick={() => setPriceUnitMode('KG')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                  priceUnitMode === 'KG'
                    ? 'bg-emerald-800 text-white shadow-2xs scale-[1.02]'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                {t('misc.mandi.perKgUnit')}
              </button>
              <button
                type="button"
                onClick={() => setPriceUnitMode('QUINTAL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                  priceUnitMode === 'QUINTAL'
                    ? 'bg-emerald-800 text-white shadow-2xs scale-[1.02]'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                {t('misc.mandi.perQuintalUnit')}
              </button>
            </div>

            {/* State Dropdown */}
            {scopeFilter === 'ALL' && (
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-semibold text-stone-800 outline-none focus:ring-2 focus:ring-emerald-600"
              >
                {states.map((state) => (
                  <option key={state} value={state}>
                    {state === 'ALL' ? t('misc.mandi.allIndianStates') : state}
                  </option>
                ))}
              </select>
            )}

            {/* Sort Selector */}
            <select
              value={`${sortField}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-') as [SortField, SortOrder];
                setSortField(field);
                setSortOrder(order);
              }}
              className="px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-semibold text-stone-800 outline-none focus:ring-2 focus:ring-emerald-600"
            >
              <option value="modalPrice-desc">{t('misc.mandi.sortPriceHigh')}</option>
              <option value="modalPrice-asc">{t('misc.mandi.sortPriceLow')}</option>
              <option value="updatedAt-desc">{t('misc.mandi.sortLatestUpdate')}</option>
            </select>

          </div>

        </div>

        {/* Category Filter Pills — derived from the published benchmarks */}
        {categories.length > 1 && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-stone-100">
            <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mr-1">
              {t('misc.mandi.filterCategory')}
            </span>
            {categories.map((category) => {
              const sample = records.find(
                (item) => (item.categoryName || item.category) === category,
              );
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 ${
                    selectedCategory === category
                      ? 'bg-emerald-800 text-white shadow-xs scale-[1.02]'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {category === 'ALL'
                    ? t('misc.mandi.allCommodities')
                    : sample
                      ? categoryLabel(sample)
                      : category}
                </button>
              );
            })}
          </div>
        )}

      </div>

      {/* 4. Mandi Rates Interactive Data Table */}
      {error ? (
        <div className="bg-white rounded-3xl border border-stone-200 shadow-xs px-6 py-16 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
          <p className="text-base font-bold text-stone-700">{error}</p>
          <p className="text-xs text-stone-400">{t('misc.mandi.noPublishedRatesHint')}</p>
        </div>
      ) : (
        emptyState
      )}

      {/* 5. Informational Commission Arbitrage Callout */}
      <div className="bg-emerald-950 text-emerald-100 rounded-3xl p-6 sm:p-10 border border-emerald-900 flex flex-col lg:flex-row items-center justify-between gap-8 shadow-xl">
        <div className="space-y-2 text-center lg:text-left">
          <div className="flex items-center justify-center lg:justify-start gap-2 text-xs font-black uppercase text-emerald-400 tracking-wider">
            <Info className="w-4 h-4" /> {t('misc.mandi.commissionArbitrage')}
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {t('misc.mandi.protectsCultivatorMargin')}
          </h3>
          <p className="text-xs sm:text-sm text-stone-300 max-w-2xl leading-relaxed">
            {t('misc.mandi.commissionArbitrageBody')}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 shrink-0">
          <Link
            href="/consumer/explore"
            className="px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg transition-all text-center"
          >
            {t('misc.mandi.directMarketplace')}
          </Link>
          <Link
            href="/farmer/dashboard"
            className="px-6 py-3.5 bg-emerald-900 hover:bg-emerald-800 text-white font-black text-xs uppercase tracking-wider rounded-2xl border border-emerald-700 transition-all text-center"
          >
            {t('misc.mandi.listFarmHarvest')}
          </Link>
        </div>
      </div>

      {/* 6. Commodity Deep-Dive Inspection Modal — only the stored fields */}
      {inspectRecord && (
        <div className="fixed inset-0 bg-stone-950/75 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-stone-200 shadow-2xl p-6 sm:p-8 space-y-6 max-h-[92vh] overflow-y-auto">

            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900">
                  {categoryLabel(inspectRecord)}
                </span>
                <h2 className="text-2xl font-black text-stone-900 tracking-tight mt-1.5">
                  {commodityLabel(inspectRecord)}
                </h2>
                {commodityLabel(inspectRecord) !== inspectRecord.commodity && (
                  <p className="text-xs text-stone-400 font-medium">{inspectRecord.commodity}</p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setInspectRecord(null)}
                className="p-2 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100 transition-colors"
                title={t('misc.mandi.closeTerminal')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Yard Details */}
            <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-2 text-xs">
              <div className="flex justify-between gap-4">
                <span className="text-stone-500 font-semibold">{t('misc.mandi.apmcYard')}</span>
                <strong className="text-stone-900 text-right">{inspectRecord.marketCenter}</strong>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-stone-500 font-semibold">{t('misc.mandi.districtState')}</span>
                <strong className="text-stone-900 text-right">
                  {inspectRecord.district}, {inspectRecord.state}
                </strong>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-stone-500 font-semibold">{t('misc.mandi.lastUpdatedAt')}</span>
                <strong className="text-stone-900 text-right">
                  {inspectRecord.updatedAt
                    ? formatDateTime(inspectRecord.updatedAt)
                    : t('misc.mandi.notAvailable')}
                </strong>
              </div>
            </div>

            {/* Price Economics Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200">
                <span className="text-[10px] font-bold text-stone-400 uppercase block">
                  {t('misc.mandi.mandiModalRate')}
                </span>
                <span className="text-2xl font-black text-stone-900 mt-0.5 block">
                  {formatPrice(inspectRecord.modalPrice)}
                </span>
                <span className="text-[11px] text-stone-500 block mt-0.5">
                  {t('misc.mandi.band', {
                    min: formatPrice(inspectRecord.minPrice),
                    max: formatPrice(inspectRecord.maxPrice),
                  })}
                </span>
              </div>

              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
                <span className="text-[10px] font-bold text-emerald-800 uppercase block">
                  {t('misc.mandi.minMaxBand')}
                </span>
                <span className="text-2xl font-black text-emerald-950 mt-0.5 block">
                  {formatPrice(inspectRecord.minPrice)} - {formatPrice(inspectRecord.maxPrice)}
                </span>
                <span className="text-[11px] text-emerald-700 block mt-0.5">{getUnitSuffix()}</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setInspectRecord(null)}
                className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl transition-colors"
              >
                {t('misc.mandi.closeTerminal')}
              </button>
              <Link
                href={`/consumer/explore?search=${encodeURIComponent(inspectRecord.commodity)}`}
                className="flex-1 py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all"
              >
                {t('misc.mandi.findHarvestLots')} <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
