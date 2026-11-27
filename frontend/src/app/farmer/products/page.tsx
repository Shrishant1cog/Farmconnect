'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Edit3,
  IndianRupee,
  Layers,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  Scale,
  Search,
  Sprout,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { fetchApi } from '../../../lib/api';
import { useI18n } from '../../../hooks/useI18n';
import AddCropModal from '../../../components/farmer/AddCropModal';
import EditCropModal from '../../../components/farmer/EditCropModal';

type UnitMode = 'KG' | 'QUINTAL';
type LotStatus = 'ACTIVE' | 'LOW_STOCK' | 'SOLD_OUT';
type StockFilter = 'ALL' | LotStatus;

interface CategoryReference {
  id?: string;
  name?: string;
  slug?: string;
}

interface FarmerLot {
  id: string;
  title: string;
  cropName: string;
  variety: string;
  categoryId: string;
  category?: CategoryReference;
  categoryName: string;
  description: string;
  farmerPrice: number;
  priceUnit: string;
  quantityAvailable: number;
  quantityUnit: string;
  minOrderKg: number;
  isAvailable: boolean;
  grade: string;
  location: string;
  imageUrl: string;
  isOrganic: boolean;
  harvestDate: string | null;
}

interface NotificationState {
  text: string;
  type: 'success' | 'error';
}

function finiteNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function quantityInKilograms(quantity: number, unit: string): number | null {
  switch (unit.toUpperCase()) {
    case 'KG':
      return quantity;
    case 'QUINTAL':
      return quantity * 100;
    case 'TON':
    case 'TONNE':
      return quantity * 1000;
    default:
      return null;
  }
}

function pricePerKilogram(price: number, unit: string): number | null {
  switch (unit.toUpperCase()) {
    case 'PER_KG':
    case 'KG':
      return price;
    case 'PER_QUINTAL':
    case 'QUINTAL':
      return price / 100;
    case 'PER_TON':
    case 'PER_TONNE':
    case 'TON':
      return price / 1000;
    default:
      return null;
  }
}

function getLotStatus(lot: FarmerLot): LotStatus {
  if (!lot.isAvailable || lot.quantityAvailable <= 0) return 'SOLD_OUT';
  if (lot.quantityAvailable < 200) return 'LOW_STOCK';
  return 'ACTIVE';
}

function LotImage({ lot }: { lot: FarmerLot }) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [lot.imageUrl]);

  if (!lot.imageUrl || imageFailed) {
    return (
      <div className="h-44 w-full bg-emerald-50/70 flex items-center justify-center">
        <Package className="w-12 h-12 text-emerald-700/50" />
      </div>
    );
  }

  return (
    <img
      src={lot.imageUrl}
      alt={lot.cropName}
      onError={() => setImageFailed(true)}
      className="h-44 w-full object-cover transition-transform duration-300 hover:scale-105"
    />
  );
}

export default function FarmerProductsPage() {
  const { t, formatNumber, formatCurrency, formatDate } = useI18n();

  const [lots, setLots] = useState<FarmerLot[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState<StockFilter>('ALL');
  const [unitMode, setUnitMode] = useState<UnitMode>('KG');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingLot, setEditingLot] = useState<FarmerLot | null>(null);
  const [deletingLot, setDeletingLot] = useState<FarmerLot | null>(null);
  const [pendingAvailabilityId, setPendingAvailabilityId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [notification, setNotification] = useState<NotificationState | null>(null);

  useEffect(() => {
    if (!notification) return;
    const timer = window.setTimeout(() => setNotification(null), 4000);
    return () => window.clearTimeout(timer);
  }, [notification]);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setLoadError(false);

    try {
      const response = await fetchApi<any>('/products/my-products');
      const backendLots = response?.data || response?.products || (Array.isArray(response) ? response : []);

      if (!Array.isArray(backendLots)) {
        throw new Error('Invalid products response');
      }

      const mappedLots: FarmerLot[] = backendLots.map((raw: any) => {
        const rawCategory = raw?.category;
        const category: CategoryReference | undefined =
          rawCategory && typeof rawCategory === 'object' ? rawCategory : undefined;
        const categoryName =
          (typeof rawCategory === 'string' ? rawCategory : category?.name) ||
          raw?.categoryName ||
          t('farmer.category.other');
        const quantityAvailable = finiteNumber(raw?.quantityAvailable);
        const cropName =
          String(raw?.cropName || '').trim() ||
          String(raw?.title || '').trim() ||
          t('farmer.products.unnamedCrop');

        return {
          id: String(raw?.id),
          title: String(raw?.title || cropName),
          cropName,
          variety: String(raw?.variety || '').trim() || t('farmer.products.nativeVariety'),
          categoryId: String(raw?.categoryId || category?.id || ''),
          category,
          categoryName,
          description: String(raw?.description || ''),
          farmerPrice: finiteNumber(raw?.farmerPrice),
          priceUnit: String(raw?.priceUnit || 'PER_KG'),
          quantityAvailable,
          quantityUnit: String(raw?.quantityUnit || 'KG'),
          minOrderKg: finiteNumber(raw?.minOrderKg),
          isAvailable:
            raw?.isAvailable === undefined ? quantityAvailable > 0 : Boolean(raw?.isAvailable),
          grade: String(raw?.grade || ''),
          location: String(raw?.location || '').trim() || t('farmer.products.karnatakaFarm'),
          imageUrl: String(raw?.imageUrl || ''),
          isOrganic: Boolean(raw?.isOrganic),
          harvestDate: raw?.harvestDate ? String(raw.harvestDate) : null,
        };
      });

      setLots(mappedLots);
    } catch {
      setLots([]);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const availableCategories = useMemo(() => {
    const distinct = new Set<string>();
    lots.forEach((lot) => {
      if (lot.categoryName) distinct.add(lot.categoryName);
    });
    return Array.from(distinct);
  }, [lots]);

  useEffect(() => {
    if (selectedCategory !== 'ALL' && !availableCategories.includes(selectedCategory)) {
      setSelectedCategory('ALL');
    }
  }, [availableCategories, selectedCategory]);

  const filteredLots = useMemo(() => {
    const query = search.trim().toLowerCase();

    return lots.filter((lot) => {
      const searchable = [
        lot.cropName,
        lot.title,
        lot.variety,
        lot.categoryName,
        lot.location,
      ]
        .join(' ')
        .toLowerCase();
      const matchesSearch = !query || searchable.includes(query);
      const matchesCategory =
        selectedCategory === 'ALL' || lot.categoryName === selectedCategory;
      const matchesStatus =
        selectedStatus === 'ALL' || getLotStatus(lot) === selectedStatus;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [lots, search, selectedCategory, selectedStatus]);

  const stats = useMemo(() => {
    const availableLots = lots.filter((lot) => lot.isAvailable);
    const totalWeightKg = availableLots.reduce((sum, lot) => {
      const kilograms = quantityInKilograms(lot.quantityAvailable, lot.quantityUnit);
      return sum + (kilograms === null ? 0 : kilograms);
    }, 0);
    const totalValue = availableLots.reduce((sum, lot) => {
      const kilograms = quantityInKilograms(lot.quantityAvailable, lot.quantityUnit);
      const perKilogram = pricePerKilogram(lot.farmerPrice, lot.priceUnit);
      return sum + (kilograms === null || perKilogram === null ? 0 : kilograms * perKilogram);
    }, 0);

    return {
      activeLots: availableLots.length,
      totalLots: lots.length,
      totalWeightKg,
      totalValue,
    };
  }, [lots]);

  const getQuantityUnitLabel = (unit: string): string => {
    switch (unit.toUpperCase()) {
      case 'KG':
        return t('common.kg');
      case 'QUINTAL':
        return t('farmer.products.quintalUnit');
      case 'TON':
      case 'TONNE':
        return t('farmer.cropModal.stockUnitTonne');
      case 'CRATES':
        return t('farmer.cropModal.stockUnitCrates');
      default:
        return t('common.quantityUnit');
    }
  };

  const getPriceUnitLabel = (unit: string): string => {
    switch (unit.toUpperCase()) {
      case 'PER_KG':
      case 'KG':
        return t('common.kg');
      case 'PER_QUINTAL':
      case 'QUINTAL':
        return t('farmer.products.quintalUnit');
      case 'PER_TON':
      case 'PER_TONNE':
      case 'TON':
        return t('farmer.cropModal.stockUnitTonne');
      case 'PER_DOZEN':
      case 'DOZEN':
        return t('farmer.cropModal.priceUnitDozen');
      default:
        return t('common.priceUnit');
    }
  };

  const getQuantityDisplay = (lot: FarmerLot) => {
    const kilograms = quantityInKilograms(lot.quantityAvailable, lot.quantityUnit);

    if (kilograms !== null) {
      if (unitMode === 'KG') {
        return { value: kilograms, unit: t('common.kg') };
      }
      return { value: kilograms / 100, unit: t('farmer.products.quintalUnit') };
    }

    return {
      value: lot.quantityAvailable,
      unit: getQuantityUnitLabel(lot.quantityUnit),
    };
  };

  const getPriceDisplay = (lot: FarmerLot) => {
    const perKilogram = pricePerKilogram(lot.farmerPrice, lot.priceUnit);

    if (perKilogram !== null) {
      if (unitMode === 'KG') {
        return { value: perKilogram, unit: t('common.kg') };
      }
      return { value: perKilogram * 100, unit: t('farmer.products.quintalUnit') };
    }

    return {
      value: lot.farmerPrice,
      unit: getPriceUnitLabel(lot.priceUnit),
    };
  };

  const getGradeLabel = (lot: FarmerLot): string => {
    const grade = lot.grade.toLowerCase();

    if (lot.isOrganic || grade.includes('organic')) {
      return t('farmer.common.organicCertified');
    }
    if (grade.includes('grade-a') || grade.includes('grade a')) {
      return t('farmer.common.gradeAExport');
    }
    if (grade.includes('standard')) {
      return t('farmer.common.standardMarket');
    }
    if (grade.includes('residue')) {
      return t('farmer.common.residueFree');
    }

    return lot.grade || t('farmer.common.qualityGrade');
  };

  const getStatusLabel = (status: LotStatus): string => {
    if (status === 'ACTIVE') return t('farmer.products.statusActive');
    if (status === 'LOW_STOCK') return t('farmer.products.statusLowStock');
    return t('farmer.products.statusSoldOut');
  };

  const toggleAvailability = async (id: string) => {
    const target = lots.find((lot) => lot.id === id);
    if (!target || pendingAvailabilityId) return;

    const nextAvailable = !target.isAvailable;
    setPendingAvailabilityId(id);

    try {
      await fetchApi(`/products/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ isAvailable: nextAvailable }),
      });
      setNotification({
        text: nextAvailable
          ? t('farmer.products.markedActive')
          : t('farmer.products.markedSoldOut'),
        type: 'success',
      });
      await loadProducts();
    } catch {
      setNotification({ text: t('farmer.common.error'), type: 'error' });
      await loadProducts();
    } finally {
      setPendingAvailabilityId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deletingLot || isDeleting) return;

    const target = deletingLot;
    setIsDeleting(true);

    try {
      await fetchApi(`/products/${encodeURIComponent(target.id)}`, {
        method: 'DELETE',
      });
      await loadProducts();
      setDeletingLot(null);
      setNotification({ text: t('farmer.products.listingRemoved'), type: 'success' });
    } catch {
      await loadProducts();
      setDeletingLot(null);
      setNotification({ text: t('farmer.common.error'), type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddSuccess = async () => {
    setIsAddModalOpen(false);
    await loadProducts();
    setNotification({ text: t('farmer.products.publishedSuccess'), type: 'success' });
  };

  const handleEditSuccess = async () => {
    setEditingLot(null);
    await loadProducts();
    setNotification({ text: t('farmer.products.updatedSuccess'), type: 'success' });
  };

  const harvestVolumeValue =
    unitMode === 'KG' ? stats.totalWeightKg : stats.totalWeightKg / 100;
  const harvestVolumeUnit =
    unitMode === 'KG' ? t('common.kg') : t('farmer.products.quintalUnit');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl border shadow-xl flex items-center gap-2.5 text-xs font-bold transition-all duration-300 animate-in slide-in-from-bottom-5 ${
            notification.type === 'success'
              ? 'bg-emerald-900 text-white border-emerald-700'
              : 'bg-red-900 text-white border-red-700'
          }`}
          role="status"
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <span>{notification.text}</span>
        </div>
      )}

      <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-stone-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all duration-200">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-950 border border-emerald-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
              <Sprout className="w-3.5 h-3.5 text-emerald-700" />
              {t('farmer.products.inventoryControl')}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 text-[10px] font-bold">
              {t('farmer.products.directBuyerPipeline')}
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-stone-900 tracking-tight">
            {t('farmer.products.pageTitle')}
          </h1>
          <p className="text-stone-500 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
            {t('farmer.products.intro')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => void loadProducts()}
            disabled={loading}
            className="p-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-2xl transition-all active:scale-95 flex items-center justify-center shadow-2xs disabled:opacity-60"
            title={t('farmer.products.refreshTitle')}
            aria-label={t('farmer.products.refreshTitle')}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-700' : ''}`} />
          </button>

          <div className="flex items-center bg-stone-100 p-1 rounded-2xl border border-stone-200 shadow-2xs">
            <button
              type="button"
              onClick={() => setUnitMode('KG')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                unitMode === 'KG'
                  ? 'bg-emerald-800 text-white shadow-2xs scale-[1.02]'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {t('farmer.products.perKg')}
            </button>
            <button
              type="button"
              onClick={() => setUnitMode('QUINTAL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                unitMode === 'QUINTAL'
                  ? 'bg-emerald-800 text-white shadow-2xs scale-[1.02]'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {t('farmer.products.perQuintal')}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="px-5 py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center gap-2 shadow-lg shadow-emerald-950/15 transition-all duration-200 active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            {t('farmer.products.listNewHarvest')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs transition-transform duration-200 hover:scale-[1.01]">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-stone-500">
              {t('farmer.products.liveActiveLots')}
            </span>
            <Layers className="w-4 h-4 text-emerald-700" />
          </div>
          <p className="text-3xl font-black text-stone-900">
            {t('farmer.products.listingsCount', { count: formatNumber(stats.activeLots) })}
          </p>
          <span className="text-xs text-stone-500 mt-1 block">
            {t('farmer.products.totalCrops', { count: formatNumber(stats.totalLots) })}
          </span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs transition-transform duration-200 hover:scale-[1.01]">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-stone-500">
              {t('farmer.products.harvestVolume')}
            </span>
            <Scale className="w-4 h-4 text-emerald-700" />
          </div>
          <p className="text-3xl font-black text-stone-900">
            {formatNumber(harvestVolumeValue, { maximumFractionDigits: 1 })}{' '}
            {harvestVolumeUnit}
          </p>
          <span className="text-xs text-stone-500 mt-1 block">
            {t('farmer.products.readyDispatch')}
          </span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs transition-transform duration-200 hover:scale-[1.01]">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-stone-500">
              {t('farmer.products.inventoryValuation')}
            </span>
            <IndianRupee className="w-4 h-4 text-emerald-700" />
          </div>
          <p className="text-3xl font-black text-emerald-800">
            {formatCurrency(stats.totalValue, { maximumFractionDigits: 0 })}
          </p>
          <span className="text-xs text-stone-500 mt-1 block">
            {t('farmer.products.grossPotential')}
          </span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs transition-transform duration-200 hover:scale-[1.01]">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-stone-500">
              {t('farmer.products.mandiBenchmark')}
            </span>
            <TrendingUp className="w-4 h-4 text-emerald-700" />
          </div>
          <p className="text-3xl font-black text-stone-900">
            {t('farmer.products.zeroCartelFee')}
          </p>
          <span className="text-xs text-stone-500 mt-1 block">
            {t('farmer.products.zeroCommission')}
          </span>
        </div>
      </div>

      <div className="bg-white/95 backdrop-blur-md p-5 rounded-3xl border border-stone-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative w-full md:flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              placeholder={t('farmer.products.searchPlaceholder')}
              aria-label={t('farmer.products.searchPlaceholder')}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-stone-50 rounded-2xl text-xs font-semibold text-stone-900 border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-600 transition-all"
            />
          </div>

          <div className="w-full md:w-56">
            <select
              value={selectedStatus}
              onChange={(event) => setSelectedStatus(event.target.value as StockFilter)}
              aria-label={t('farmer.products.allStockStatuses')}
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-semibold text-stone-800 outline-none focus:ring-2 focus:ring-emerald-600"
            >
              <option value="ALL">{t('farmer.products.allStockStatuses')}</option>
              <option value="ACTIVE">{t('farmer.products.activeInStock')}</option>
              <option value="LOW_STOCK">{t('farmer.products.lowInventory')}</option>
              <option value="SOLD_OUT">{t('farmer.products.soldOutOffSeason')}</option>
            </select>
          </div>
        </div>

        <div
          className="flex flex-wrap items-center gap-2 pt-2 border-t border-stone-100"
          role="group"
          aria-label={t('farmer.products.filterCommodity')}
        >
          <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mr-1">
            {t('farmer.products.filterCommodity')}
          </span>
          <button
            type="button"
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 ${
              selectedCategory === 'ALL'
                ? 'bg-emerald-800 text-white shadow-xs scale-[1.02]'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            {t('farmer.products.allCommodities')}
          </button>
          {availableCategories.map((category) => (
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
              {category}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="min-h-[35vh] flex flex-col items-center justify-center text-emerald-800 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-700" />
          <span className="font-bold tracking-widest text-xs uppercase text-stone-400">
            {t('farmer.products.syncing')}
          </span>
        </div>
      ) : loadError ? (
        <div className="bg-white rounded-3xl border border-red-200 p-10 text-center max-w-md mx-auto space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-red-50 text-red-700 flex items-center justify-center mx-auto border border-red-100">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h3 className="text-base font-black text-stone-900">{t('farmer.common.error')}</h3>
          <p className="text-xs text-stone-500">{t('farmer.common.error')}</p>
          <button
            type="button"
            onClick={() => void loadProducts()}
            className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-xs active:scale-95"
          >
            {t('farmer.common.retry')}
          </button>
        </div>
      ) : filteredLots.length === 0 ? (
        <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center max-w-md mx-auto space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto border border-emerald-100 shadow-2xs">
            <Package className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-black text-stone-900">
              {t('farmer.products.noLotsTitle')}
            </h3>
            <p className="text-xs text-stone-500">{t('farmer.products.noLotsBody')}</p>
          </div>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-xs active:scale-95"
          >
            {t('farmer.products.createFirst')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLots.map((lot) => {
            const status = getLotStatus(lot);
            const quantity = getQuantityDisplay(lot);
            const price = getPriceDisplay(lot);
            const isSoldOut = status === 'SOLD_OUT';

            return (
              <article
                key={lot.id}
                className={`bg-white rounded-3xl border transition-all duration-200 shadow-xs flex flex-col justify-between overflow-hidden ${
                  isSoldOut
                    ? 'border-stone-200 opacity-75 bg-stone-50/50'
                    : 'border-stone-200/90 hover:border-emerald-300 hover:shadow-md'
                }`}
              >
                <div className="relative overflow-hidden bg-stone-100">
                  <LotImage lot={lot} />
                  {lot.isOrganic && (
                    <span className="absolute top-3 left-3 bg-emerald-800/90 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-xs">
                      {t('farmer.products.organic')}
                    </span>
                  )}
                </div>

                <div className="p-6 space-y-4 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {lot.categoryName}
                    </span>
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                        status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : status === 'LOW_STOCK'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-stone-200 text-stone-700'
                      }`}
                    >
                      {status === 'ACTIVE' && <CheckCircle2 className="w-3 h-3" />}
                      {status === 'LOW_STOCK' && <AlertTriangle className="w-3 h-3" />}
                      {getStatusLabel(status)}
                    </span>
                  </div>

                  <div>
                    <h2 className="text-xl font-black text-stone-900 tracking-tight">
                      {lot.cropName}
                    </h2>
                    <p className="text-xs text-stone-500 font-medium mt-1">
                      {t('farmer.common.variety')}: {lot.variety}
                    </p>
                    <p className="text-xs text-stone-500 font-medium mt-0.5">
                      {t('farmer.common.qualityGrade')}: {getGradeLabel(lot)}
                    </p>
                  </div>

                  <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-stone-400 uppercase block">
                        {t('farmer.products.yourGatePrice')}
                      </span>
                      <span className="text-xl font-black text-emerald-800 block mt-0.5">
                        {formatCurrency(price.value, { maximumFractionDigits: 2 })} {price.unit}
                      </span>
                      <span className="text-[10px] font-medium text-emerald-600 block">
                        {t('farmer.products.minOrder', {
                          quantity: formatNumber(lot.minOrderKg, { maximumFractionDigits: 2 }),
                        })}
                      </span>
                    </div>

                    <div className="border-l border-stone-200 pl-3">
                      <span className="text-[10px] font-bold text-stone-400 uppercase block">
                        {t('farmer.products.availableQuantity')}
                      </span>
                      <span className="text-xl font-black text-stone-900 block mt-0.5">
                        {formatNumber(quantity.value, { maximumFractionDigits: 2 })} {quantity.unit}
                      </span>
                    </div>
                  </div>

                  <dl className="space-y-2 text-xs">
                    <div className="flex justify-between gap-3">
                      <dt className="text-stone-500 font-medium">
                        {t('farmer.products.harvestDate')}
                      </dt>
                      <dd className="text-stone-700 font-bold text-right">
                        {lot.harvestDate
                          ? formatDate(lot.harvestDate) || t('common.unknown')
                          : t('common.unknown')}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-stone-500 font-medium">
                        {t('farmer.products.plotYard')}
                      </dt>
                      <dd className="text-stone-700 font-bold truncate max-w-[160px] text-right">
                        {lot.location}
                      </dd>
                    </div>
                  </dl>

                  {lot.description && (
                    <div>
                      <span className="text-[10px] font-bold text-stone-400 uppercase block mb-1">
                        {t('farmer.common.description')}
                      </span>
                      <p className="text-xs text-stone-600 leading-relaxed line-clamp-2">
                        {lot.description}
                      </p>
                    </div>
                  )}
                </div>

                <div className="px-6 py-3.5 bg-stone-50/80 border-t border-stone-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={lot.isAvailable}
                    aria-label={
                      lot.isAvailable
                        ? t('farmer.common.active')
                        : t('farmer.common.soldOut')
                    }
                    onClick={() => void toggleAvailability(lot.id)}
                    disabled={pendingAvailabilityId !== null}
                    className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-xl border transition-all active:scale-95 disabled:opacity-60 ${
                      lot.isAvailable
                        ? 'bg-emerald-800 border-emerald-800 text-white hover:bg-emerald-900'
                        : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    {pendingAvailabilityId === lot.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <span
                        className={`w-3 h-3 rounded-full ${
                          lot.isAvailable ? 'bg-white' : 'bg-stone-400'
                        }`}
                      />
                    )}
                    {lot.isAvailable
                      ? t('farmer.common.active')
                      : t('farmer.common.soldOut')}
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditingLot(lot)}
                      className="p-2 rounded-xl text-stone-400 hover:text-emerald-800 hover:bg-emerald-50 transition-colors"
                      title={t('farmer.products.updateProduce')}
                      aria-label={t('farmer.products.updateProduce')}
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingLot(lot)}
                      className="p-2 rounded-xl text-stone-400 hover:text-red-700 hover:bg-red-50 transition-colors"
                      title={t('common.delete')}
                      aria-label={t('common.delete')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <AddCropModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleAddSuccess}
      />

      <EditCropModal
        crop={editingLot}
        isOpen={editingLot !== null}
        onClose={() => setEditingLot(null)}
        onSuccess={handleEditSuccess}
      />

      {deletingLot && (
        <div className="fixed inset-0 bg-stone-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 transition-all duration-200 animate-in fade-in">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="remove-lot-title"
            className="bg-white rounded-3xl p-6 sm:p-7 max-w-sm w-full border border-stone-200 shadow-2xl text-center space-y-4"
          >
            <div>
              <h3 id="remove-lot-title" className="text-base font-black text-stone-900">
                {t('farmer.products.removeTitle')}
              </h3>
              <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                {t('farmer.products.removeDescription', { name: deletingLot.cropName })}
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingLot(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-stone-100 text-stone-700 font-bold rounded-xl text-xs hover:bg-stone-200 transition-colors disabled:opacity-60"
              >
                {t('farmer.common.keepListing')}
              </button>
              <button
                type="button"
                onClick={() => void confirmDelete()}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-red-700 hover:bg-red-800 text-white font-black uppercase tracking-wider rounded-xl text-xs shadow-xs transition-all active:scale-95 flex items-center justify-center gap-1 disabled:opacity-60"
              >
                {isDeleting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  t('farmer.common.yesRemove')
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
