'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { 
  Sprout, Package, MessageSquare, Plus, 
  MapPin, IndianRupee, Scale, Edit3, Trash2, 
  Search, X, ArrowUpRight, ArrowRight, CheckCircle2,
  Loader2, RefreshCw, AlertCircle, Sparkles
} from 'lucide-react';
import { fetchApi } from '../../../lib/api';
import { useAuth } from '../../../hooks/useAuth';
import { useI18n } from '../../../hooks/useI18n';
import AddCropModal from '../../../components/farmer/AddCropModal';
import EditCropModal from '../../../components/farmer/EditCropModal';

// ============================================================================
// 1. DATA MODELS & SEED DATA
// ============================================================================

const CATEGORY_FALLBACKS: Record<string, string> = {
  GRAINS: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=800&q=80',
  MILLETS: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80',
  VEGETABLES: 'https://images.unsplash.com/photo-1597362925123-77861d3fbac7?auto=format&fit=crop&w=800&q=80',
  FRUITS: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=800&q=80',
  SPICES: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=800&q=80',
  DEFAULT: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=800&q=80',
};

function resolveFallback(title?: string, categoryName?: string): string {
  const probe = `${title || ''} ${categoryName || ''}`.toUpperCase();
  if (probe.includes('RICE') || probe.includes('WHEAT') || probe.includes('GRAIN')) return CATEGORY_FALLBACKS.GRAINS;
  if (probe.includes('RAGI') || probe.includes('MILLET') || probe.includes('JOWAR')) return CATEGORY_FALLBACKS.MILLETS;
  if (probe.includes('TOMATO') || probe.includes('ONION') || probe.includes('VEG')) return CATEGORY_FALLBACKS.VEGETABLES;
  if (probe.includes('BANANA') || probe.includes('MANGO') || probe.includes('FRUIT')) return CATEGORY_FALLBACKS.FRUITS;
  if (probe.includes('CHILLI') || probe.includes('PEPPER') || probe.includes('SPICE')) return CATEGORY_FALLBACKS.SPICES;
  return CATEGORY_FALLBACKS.DEFAULT;
}

interface CatalogCrop {
  name: string;
  category?: string;
  aliases?: string[];
}

interface CatalogCategory {
  id: string;
  name: string;
  slug?: string;
}

const CATEGORY_KEY_BY_SLUG: Record<string, string> = {
  vegetables: 'farmer.category.vegetables',
  fruits: 'farmer.category.fruits',
  grains: 'farmer.category.grainsMillets',
  'grains-millets': 'farmer.category.grainsMillets',
  spices: 'farmer.category.spicesHerbs',
  'spices-herbs': 'farmer.category.spicesHerbs',
  pulses: 'farmer.category.pulsesLegumes',
  'pulses-legumes': 'farmer.category.pulsesLegumes',
  oilseeds: 'farmer.category.oilseeds',
  'plantation-crops': 'farmer.category.plantationCrops',
  'cash-crops': 'farmer.category.cashCrops',
  'flowers-floriculture': 'farmer.category.flowersFloriculture',
  'nuts-dry-produce': 'farmer.category.nutsDryProduce',
};

function categoryTranslationKey(category: CatalogCategory): string {
  const slug = (category.slug || '').trim().toLowerCase();
  if (CATEGORY_KEY_BY_SLUG[slug]) return CATEGORY_KEY_BY_SLUG[slug];

  const name = (category.name || '').toLowerCase();
  if (name.includes('grain') || name.includes('millet')) return 'farmer.category.grainsMillets';
  if (name.includes('spice') && name.includes('cash')) return 'farmer.category.spicesCashCrops';
  if (name.includes('spice') || name.includes('herb')) return 'farmer.category.spicesHerbs';
  if (name.includes('pulse') || name.includes('legume')) return 'farmer.category.pulsesLegumes';
  if (name.includes('oilseed')) return 'farmer.category.oilseeds';
  if (name.includes('plantation')) return 'farmer.category.plantationCrops';
  if (name.includes('cash')) return 'farmer.category.cashCrops';
  if (name.includes('flower') || name.includes('floriculture')) return 'farmer.category.flowersFloriculture';
  if (name.includes('nut') || name.includes('dry')) return 'farmer.category.nutsDryProduce';
  if (name.includes('vegetable')) return 'farmer.category.vegetables';
  if (name.includes('fruit')) return 'farmer.category.fruits';
  return 'farmer.category.other';
}

function categoryMatchesCrop(category: CatalogCategory, cropCategory?: string): boolean {
  const target = (cropCategory || '').toLowerCase();
  const slug = (category.slug || '').toLowerCase();
  const name = (category.name || '').toLowerCase();

  if (!target) return false;
  if (target === slug) return true;
  if (target === 'grains-millets' && (slug === 'grains' || name.includes('grain'))) return true;
  if (target === 'spices-herbs' && (slug === 'spices' || name.includes('spice'))) return true;
  if (target === 'cash-crops' && name.includes('cash')) return true;
  if (target === 'pulses-legumes' && (slug === 'pulses' || name.includes('pulse'))) return true;
  return name.includes(target.replaceAll('-', ' '));
}

interface Product {
  id: string;
  title: string;
  cropName?: string;
  variety?: string;
  categoryId?: string;
  description?: string;
  categoryName?: string;
  farmerPrice: number;
  mandiBenchmark: number;
  priceUnit: string;
  quantityAvailable: number;
  quantityUnit: string;
  minOrderKg: number;
  isAvailable: boolean;
  grade: 'Grade-A Export' | 'Standard Market' | 'Residue Free';
  location: string;
  imageUrl?: string;
}

interface BuyerChatLead {
  id: string;
  buyerName: string;
  buyerPhone: string;
  cropTopic: string;
  lastMessage: string;
  time: string;
  quotedPrice?: number;
  unread: boolean;
}

function SafeImage({ 
  src, 
  alt, 
  title, 
  categoryName, 
  className 
}: { 
  src?: string; 
  alt: string; 
  title?: string; 
  categoryName?: string; 
  className?: string; 
}) {
  const fallback = useMemo(() => resolveFallback(title, categoryName), [title, categoryName]);
  const [currentSrc, setCurrentSrc] = useState<string>(src && src.trim() !== '' ? src : fallback);

  useEffect(() => {
    setCurrentSrc(src && src.trim() !== '' ? src : fallback);
  }, [src, fallback]);

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      onError={() => setCurrentSrc(fallback)}
    />
  );
}

// ============================================================================
// 2. MAIN FARMER DASHBOARD COMPONENT
// ============================================================================

export default function FarmerDashboardPage() {
  const { user: authUser } = useAuth();
  const { t, formatNumber } = useI18n();

  // State management
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [leads, setLeads] = useState<BuyerChatLead[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'ACTIVE' | 'SOLD_OUT'>('ALL');

  // Modals & Operations
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Catalogue data for independent crop and variety selection
  const [cropSearch, setCropSearch] = useState('');
  const [catalogCrops, setCatalogCrops] = useState<CatalogCrop[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  // Auto-dismiss notification
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), 3000);
    return () => clearTimeout(timer);
  }, [notification]);

  // Load catalogue categories and debounce crop searches
  useEffect(() => {
    let cancelled = false;
    setCategoryLoading(true);
    setCategoryError(null);
    fetchApi('/catalog/categories')
      .then((response) => {
        const data = response?.data || response?.categories || (Array.isArray(response) ? response : []);
        if (!cancelled && Array.isArray(data)) setCategories(data);
      })
      .catch(() => {
        if (!cancelled) setCategoryError(t('farmer.cropPicker.categoriesError'));
      })
      .finally(() => {
        if (!cancelled) setCategoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setCatalogLoading(true);
      setCatalogError(null);
      try {
        const query = cropSearch.trim() ? `?search=${encodeURIComponent(cropSearch.trim())}` : '';
        const response = await fetchApi(`/catalog/crops${query}`);
        const results = response?.data || response?.crops || (Array.isArray(response) ? response : []);
        if (!cancelled && Array.isArray(results)) setCatalogCrops(results);
      } catch {
        if (!cancelled) setCatalogError(t('farmer.cropPicker.error'));
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [cropSearch, t]);

  // Safe SSR hydration
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedUser = localStorage.getItem('farmconnect_user') || localStorage.getItem('fc_user');
        if (storedUser) {
          setCurrentUser(JSON.parse(storedUser));
        }
      } catch {
        // A malformed cache is ignored - the backend is the source of truth.
      }
    }
  }, []);

  // Update when auth context changes
  useEffect(() => {
    if (authUser) {
      setCurrentUser(authUser);
    }
  }, [authUser]);

  // Fetch backend products safely
  const fetchFarmerProducts = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await fetchApi('/products/my-products');
      const data = res?.data || res?.products || (Array.isArray(res) ? res : []);
      if (!Array.isArray(data)) {
        throw new Error('Invalid products response');
      }

      // Only the real shared lots are shown - never a demo listing.
      const mapped: Product[] = data.map((p: any, idx: number) => ({
        id: p.id || `prod-db-${idx}`,
        title: p.title || t('farmer.dashboard.defaultProductTitle'),
        cropName: p.cropName || p.title || t('farmer.dashboard.defaultProductTitle'),
        variety: p.variety || '',
        categoryId: p.categoryId || p.category?.id || '',
        description: p.description || '',
        categoryName: p.category?.name || p.categoryName || t('farmer.category.vegetables'),
        farmerPrice: Number(p.farmerPrice) || 0,
        mandiBenchmark: Number(p.mandiBenchmark) || Number(p.farmerPrice) * 1.05 || 0,
        priceUnit: p.priceUnit ? p.priceUnit.replace(/^PER_/, '').toLowerCase() : 'kg',
        quantityAvailable: Number(p.quantityAvailable) || 0,
        quantityUnit: p.quantityUnit ? p.quantityUnit.toLowerCase() : 'kg',
        minOrderKg: Number(p.minOrderKg) || 0,
        isAvailable: p.isAvailable !== undefined ? Boolean(p.isAvailable) : true,
        grade: p.grade || t('farmer.common.gradeAExport'),
        location: p.location || t('farmer.dashboard.defaultLocation'),
        imageUrl: p.imageUrl || '',
      }));

      setProducts(mapped);
    } catch {
      setProducts([]);
    } finally {
      setIsRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    fetchFarmerProducts();
  }, [fetchFarmerProducts]);

  /**
   * Loads the shared buyer enquiries (the real chat leads) from the backend.
   */
  const fetchBuyerLeads = useCallback(async () => {
    try {
      const res = await fetchApi('/enquiries/farmer');
      const data = res?.data || res?.enquiries || (Array.isArray(res) ? res : []);
      if (!Array.isArray(data)) {
        throw new Error('Invalid enquiries response');
      }

      const mapped: BuyerChatLead[] = data.map((enquiry: any, idx: number) => {
        const lastMessage = Array.isArray(enquiry?.messages) ? enquiry.messages[0] : null;
        return {
          id: String(enquiry?.id || `lead-${idx}`),
          buyerName: String(enquiry?.consumer?.name || ''),
          buyerPhone: String(enquiry?.consumer?.phone || ''),
          cropTopic: String(enquiry?.product?.title || enquiry?.subject || ''),
          lastMessage: String(lastMessage?.content || ''),
          time: String(lastMessage?.createdAt || enquiry?.updatedAt || enquiry?.createdAt || ''),
          quotedPrice: Number(enquiry?.product?.farmerPrice) || undefined,
          unread: false,
        };
      });

      setLeads(mapped);
    } catch {
      // No enquiries yet - show the real empty state, never demo leads.
      setLeads([]);
    }
  }, []);

  useEffect(() => {
    fetchBuyerLeads();
  }, [fetchBuyerLeads]);

  // Persist local changes
  const syncProducts = (updated: Product[]) => {
    setProducts(updated);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('farmconnect_farmer_products', JSON.stringify(updated));
      } catch {
        // ignore storage errors
      }
    }
  };

  // Toggle availability
  const toggleAvailability = async (id: string) => {
    const target = products.find((p) => p.id === id);
    if (!target) return;

    const nextState = !target.isAvailable;
    const updated = products.map((p) => (p.id === id ? { ...p, isAvailable: nextState } : p));
    syncProducts(updated);

    try {
      await fetchApi(`/products/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isAvailable: nextState }),
      });
      setNotification({
        text: t('farmer.dashboard.availabilityUpdate', {
          status: nextState ? t('farmer.common.active') : t('farmer.common.soldOut'),
        }),
        type: 'success',
      });
    } catch {
      // The backend rejected the change - reload and report the real state
      // instead of pretending the listing was toggled.
      await fetchFarmerProducts();
      setNotification({ text: t('farmer.common.error'), type: 'error' });
    }
  };

  // Filtered view calculation
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch = 
        (p.cropName || p.title).toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.variety || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.location.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
      if (filterMode === 'ACTIVE') return p.isAvailable;
      if (filterMode === 'SOLD_OUT') return !p.isAvailable;
      return true;
    });
  }, [products, searchQuery, filterMode]);

  // Analytical KPIs
  const stats = useMemo(() => {
    const totalLots = products.length;
    const activeLots = products.filter((p) => p.isAvailable).length;
    const totalKg = products.reduce((sum, p) => sum + (p.isAvailable ? p.quantityAvailable : 0), 0);
    const grossPotential = products.reduce(
      (sum, p) => sum + (p.isAvailable ? p.quantityAvailable * p.farmerPrice : 0), 
      0
    );

    return {
      activeLots,
      totalLots,
      totalTonnes: (totalKg / 1000).toFixed(1),
      grossValuation: formatNumber(Math.round(grossPotential)),
      unreadLeads: leads.filter((l) => l.unread).length,
    };
  }, [products, leads, formatNumber]);

  const farmerName = currentUser?.name || authUser?.name || t('farmer.dashboard.defaultFarmerName', { name: 'Ramesh Kumar' });
  const farmerDistrict = currentUser?.district || authUser?.district || 'Mandya';
  const farmerTaluk = currentUser?.taluk || authUser?.taluk || 'Pandavapura';

  const getCategoryLabel = (categoryName?: string, categoryId?: string) => {
    const matched = categories.find((category) => category.id === categoryId);
    if (matched) return t(categoryTranslationKey(matched));
    if (!categoryName) return t('farmer.category.other');
    const key = categoryTranslationKey({ id: '', name: categoryName });
    if (key !== 'farmer.category.other') return t(key);
    return /^[A-Za-z& ]+$/.test(categoryName) ? t('farmer.category.other') : categoryName;
  };

  const getGradeLabel = (grade: Product['grade']) => {
    if (grade === 'Standard Market') return t('farmer.common.standardMarket');
    if (grade === 'Residue Free') return t('farmer.common.residueFree');
    return t('farmer.common.gradeAExport');
  };

  /**
   * Called by the shared Add / Edit crop modals once the backend accepted
   * the change. The list is re-read from the backend so the dashboard always
   * shows the real shared state.
   */
  const handleProductSaved = async () => {
    setIsAddModalOpen(false);
    setEditingProduct(null);
    await fetchFarmerProducts();
    setNotification({ text: t('farmer.dashboard.updatedSuccess'), type: 'success' });
  };

  // Handle Delete Product
  const handleDeleteProduct = async () => {
    if (!deletingProduct) return;

    setIsSubmitting(true);
    const targetId = deletingProduct.id;

    try {
      await fetchApi(`/products/${targetId}`, {
        method: 'DELETE',
      });
      setDeletingProduct(null);
      await fetchFarmerProducts();
      setNotification({ text: t('farmer.dashboard.removedSuccess'), type: 'success' });
    } catch {
      // The delete was rejected by the backend - reload and report the error
      // instead of pretending the listing is gone.
      await fetchFarmerProducts();
      setDeletingProduct(null);
      setNotification({ text: t('farmer.common.error'), type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl border shadow-xl flex items-center gap-2.5 text-xs font-bold transition-all duration-300 animate-in slide-in-from-bottom-5 ${
          notification.type === 'success' 
            ? 'bg-emerald-900 text-white border-emerald-700' 
            : 'bg-red-900 text-white border-red-700'
        }`}>
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <span>{notification.text}</span>
        </div>
      )}

      {/* 1. Header Banner */}
      <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-stone-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all duration-200">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-950 border border-emerald-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
              <Sprout className="w-3.5 h-3.5 text-emerald-700" /> {t('farmer.dashboard.commandCenter')}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 text-[10px] font-bold flex items-center gap-1">
              <MapPin className="w-3 h-3 text-emerald-700" /> {farmerTaluk}, {farmerDistrict}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
            {t('farmer.dashboard.welcome', { name: farmerName })}
          </h1>
          <p className="text-stone-500 text-xs sm:text-sm mt-1 max-w-xl leading-relaxed">
            {t('farmer.dashboard.intro')}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={fetchFarmerProducts}
            disabled={isRefreshing}
            className="p-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-2xl transition-all active:scale-95 flex items-center justify-center"
            title={t('farmer.dashboard.refreshTitle')}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-700' : ''}`} />
          </button>
          
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="px-5 py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center gap-2 shadow-lg shadow-emerald-950/15 transition-all duration-200 active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" /> {t('farmer.dashboard.listNewHarvest')}
          </button>
        </div>
      </div>

      {/* 2. Analytical KPI Stream */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs transition-transform duration-200 hover:scale-[1.01]">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-stone-500">{t('farmer.dashboard.activeCropLots')}</span>
            <Package className="w-4 h-4 text-emerald-700" />
          </div>
          <p className="text-3xl font-black text-stone-900">{stats.activeLots} / {stats.totalLots}</p>
          <span className="text-xs text-stone-500 mt-1 block">{t('farmer.dashboard.lotsProcurement')}</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs transition-transform duration-200 hover:scale-[1.01]">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-stone-500">{t('farmer.dashboard.harvestVolume')}</span>
            <Scale className="w-4 h-4 text-emerald-700" />
          </div>
          <p className="text-3xl font-black text-stone-900">{stats.totalTonnes} MT</p>
          <span className="text-xs text-stone-500 mt-1 block">{t('farmer.dashboard.inStockTonnage')}</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs transition-transform duration-200 hover:scale-[1.01]">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-stone-500">{t('farmer.dashboard.grossGateValuation')}</span>
            <IndianRupee className="w-4 h-4 text-emerald-700" />
          </div>
          <p className="text-3xl font-black text-emerald-800">₹{stats.grossValuation}</p>
          <span className="text-xs text-stone-500 mt-1 block">{t('farmer.dashboard.zeroBrokerValue')}</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs transition-transform duration-200 hover:scale-[1.01]">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-stone-500">{t('farmer.dashboard.tradeInquiries')}</span>
            <MessageSquare className="w-4 h-4 text-emerald-700" />
          </div>
          <p className="text-3xl font-black text-stone-900">{t('farmer.dashboard.inquiryCount', { count: leads.length })}</p>
          <span className="text-xs text-emerald-700 font-bold mt-1 block">{t('farmer.dashboard.unreadNegotiations', { count: stats.unreadLeads })}</span>
        </div>
      </div>

      {/* 3. Main Split View: Produce Inventory & Buyer Trade Inquiries */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left: Active Harvest Inventory (8 Columns) */}
        <div className="lg:col-span-8 space-y-4">
          
          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={t('farmer.dashboard.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-stone-50 rounded-xl text-xs font-semibold text-stone-900 border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-600 transition-all"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              {(['ALL', 'ACTIVE', 'SOLD_OUT'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setFilterMode(mode)}
                  className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${
                    filterMode === mode 
                      ? 'bg-emerald-800 text-white shadow-2xs' 
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {mode === 'ALL'
                    ? t('farmer.dashboard.filterAll')
                    : mode === 'ACTIVE'
                    ? t('farmer.dashboard.filterActive')
                    : t('farmer.dashboard.filterSoldOut')}
                </button>
              ))}
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center max-w-md mx-auto space-y-3">
              <Package className="w-10 h-10 text-stone-300 mx-auto" />
              <h3 className="text-sm font-black text-stone-900">{t('farmer.dashboard.noBatchesTitle')}</h3>
              <p className="text-xs text-stone-500">{t('farmer.dashboard.noBatchesBody')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredProducts.map((prod) => {
                const isUnderMandi = prod.farmerPrice <= prod.mandiBenchmark;

                return (
                  <div 
                    key={prod.id}
                    className={`bg-white rounded-3xl border transition-all duration-200 shadow-2xs flex flex-col justify-between overflow-hidden ${
                      !prod.isAvailable ? 'border-stone-200 opacity-75 bg-stone-50/50' : 'border-stone-200/90 hover:border-emerald-300'
                    }`}
                  >
                    <div>
                      {/* Image Preview */}
                      <div className="h-40 w-full bg-stone-100 relative overflow-hidden">
                        <SafeImage
                          src={prod.imageUrl}
                          alt={prod.title}
                          title={prod.title}
                          categoryName={prod.categoryName}
                          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                        />
                        <span className={`absolute top-3 right-3 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-xs ${
                          prod.isAvailable ? 'bg-emerald-800 text-white' : 'bg-stone-900/80 text-white'
                        }`}>
                          {prod.isAvailable ? t('farmer.dashboard.statusActiveBatch') : t('farmer.dashboard.statusSoldOut')}
                        </span>
                      </div>

                      <div className="p-5 space-y-3">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block">
                            {getCategoryLabel(prod.categoryName, prod.categoryId)} • {getGradeLabel(prod.grade)}
                          </span>
                          <h3 className="font-bold text-stone-900 text-base line-clamp-1">{prod.cropName || prod.title}</h3>
                          {prod.variety && (
                            <p className="text-[11px] font-semibold text-stone-500 mt-0.5">
                              {t('farmer.common.variety')}: {prod.variety}
                            </p>
                          )}
                        </div>

                        <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed">{prod.description}</p>

                        <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-[10px] font-bold text-stone-400 uppercase block">{t('farmer.dashboard.yourGateRate')}</span>
                            <span className="text-lg font-black text-emerald-800">₹{prod.farmerPrice}/{prod.priceUnit}</span>
                            <span className="text-[10px] text-stone-500 block">{t('farmer.dashboard.minOrder', { quantity: formatNumber(prod.minOrderKg) })}</span>
                          </div>
                          <div className="border-l border-stone-200 pl-2">
                            <span className="text-[10px] font-bold text-stone-400 uppercase block">{t('farmer.dashboard.apmcModalRate')}</span>
                            <span className="text-lg font-black text-stone-700">₹{prod.mandiBenchmark}/{prod.priceUnit}</span>
                            <span className={`text-[10px] font-bold block ${isUnderMandi ? 'text-emerald-700' : 'text-amber-700'}`}>
                              {isUnderMandi ? t('farmer.dashboard.competitiveMandi') : t('farmer.dashboard.premiumGrade')}
                            </span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center text-xs text-stone-600 pt-1">
                          <span>{t('farmer.dashboard.stock', { quantity: formatNumber(prod.quantityAvailable), unit: prod.quantityUnit })}</span>
                          <span className="flex items-center gap-1 text-[11px] text-stone-500">
                            <MapPin className="w-3 h-3 text-emerald-700" /> {prod.location}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-stone-50/80 border-t border-stone-100 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => toggleAvailability(prod.id)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all active:scale-95 ${
                          prod.isAvailable
                            ? 'bg-white border-stone-200 text-stone-700 hover:bg-stone-100'
                            : 'bg-emerald-800 border-emerald-800 text-white hover:bg-emerald-900'
                        }`}
                      >
                        {prod.isAvailable ? t('farmer.dashboard.markSoldOut') : t('farmer.dashboard.markInStock')}
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setEditingProduct(prod)}
                          className="p-2 text-stone-400 hover:text-emerald-800 hover:bg-emerald-50 rounded-xl transition-colors"
                          title={t('farmer.dashboard.editTitle')}
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingProduct(prod)}
                          className="p-2 text-stone-400 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors"
                          title={t('farmer.dashboard.deleteTitle')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* Right: Buyer Inquiries & Trade Chats (4 Columns) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-800" />
                <h3 className="text-sm font-black uppercase tracking-wider text-stone-900">
                  {t('farmer.dashboard.buyerInquiriesTitle')}
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-black uppercase">
                {t('farmer.dashboard.activeCount', { count: stats.unreadLeads })}
              </span>
            </div>

            <p className="text-xs text-stone-500 leading-relaxed">
              {t('farmer.dashboard.buyerDescription')}
            </p>

            <div className="space-y-3">
              {leads.map((lead) => (
                <div 
                  key={lead.id}
                  className={`p-3.5 rounded-2xl border transition-all space-y-2 ${
                    lead.unread ? 'bg-emerald-50/70 border-emerald-200' : 'bg-stone-50 border-stone-200'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-xs font-black text-stone-900 line-clamp-1">{lead.buyerName}</h4>
                      <span className="text-[10px] font-bold text-emerald-800 uppercase block">{lead.cropTopic}</span>
                    </div>
                    <span className="text-[9px] text-stone-400">{lead.time}</span>
                  </div>

                  <p className="text-xs text-stone-600 line-clamp-2 leading-tight font-medium">
                    &ldquo;{lead.lastMessage}&rdquo;
                  </p>

                  <div className="flex items-center justify-between pt-1 border-t border-stone-200/50 text-xs">
                    <span className="text-[11px] font-bold text-stone-700">
                      {t('farmer.dashboard.targetRate', {
                        price: Number(lead.quotedPrice || 0),
                      })}
                    </span>
                    <Link
                      href="/farmer/inquiries"
                      className="px-2.5 py-1 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-[10px] uppercase tracking-wider rounded-lg flex items-center gap-1 transition-all active:scale-95"
                    >
                      {t('farmer.dashboard.replyBuyer')} <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            <Link
              href="/farmer/inquiries"
              className="w-full py-3 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5"
            >
              {t('farmer.dashboard.openInbox')} <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

      </div>

      {/* Shared crop modals - the same components the Lots page uses. */}
      <AddCropModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleProductSaved}
      />

      <EditCropModal
        crop={editingProduct}
        isOpen={editingProduct !== null}
        onClose={() => setEditingProduct(null)}
        onSuccess={handleProductSaved}
      />

      {/* Delete Confirmation Modal */}
      {deletingProduct && (
        <div className="fixed inset-0 bg-stone-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 transition-all duration-200 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-sm w-full border border-stone-200 shadow-2xl text-center space-y-4">
            <div>
              <h3 className="text-base font-black text-stone-900">
                {t('farmer.dashboard.removeModalTitle')}
              </h3>
              <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                {t('farmer.dashboard.removeDescription', { title: deletingProduct.title })}
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingProduct(null)}
                className="flex-1 py-2.5 bg-stone-100 text-stone-700 font-bold rounded-xl text-xs hover:bg-stone-200 transition-colors"
              >
                {t('farmer.common.keepListing')}
              </button>
              <button
                type="button"
                onClick={handleDeleteProduct}
                disabled={isSubmitting}
                className="flex-1 py-2.5 bg-red-700 hover:bg-red-800 text-white font-black uppercase tracking-wider rounded-xl text-xs shadow-xs transition-all active:scale-95 flex items-center justify-center gap-1"
              >
                {isSubmitting ? (
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
