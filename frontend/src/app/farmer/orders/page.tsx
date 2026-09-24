'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchApi } from '../../../lib/api';
import { 
  Sprout, Plus, Search, Filter, Edit3, Trash2, 
  CheckCircle2, XCircle, AlertCircle, Loader2, X, 
  Package, RefreshCw, Sparkles, Tag, ArrowUpDown 
} from 'lucide-react';

const CATEGORY_FALLBACKS: Record<string, string> = {
  GRAINS: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=800&q=80',
  MILLETS: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80',
  VEGETABLES: 'https://images.unsplash.com/photo-1597362925123-77861d3fbac7?auto=format&fit=crop&w=800&q=80',
  FRUITS: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=800&q=80',
  SPICES: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=800&q=80',
  ORGANIC: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80',
  DEFAULT: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=800&q=80',
};

function resolveFallback(title?: string, categoryName?: string, isOrganic?: boolean): string {
  const probe = `${title || ''} ${categoryName || ''}`.toUpperCase();
  if (probe.includes('RICE') || probe.includes('WHEAT') || probe.includes('GRAIN')) return CATEGORY_FALLBACKS.GRAINS;
  if (probe.includes('RAGI') || probe.includes('MILLET') || probe.includes('JOWAR')) return CATEGORY_FALLBACKS.MILLETS;
  if (probe.includes('TOMATO') || probe.includes('ONION') || probe.includes('VEG') || probe.includes('POTATO')) return CATEGORY_FALLBACKS.VEGETABLES;
  if (probe.includes('MANGO') || probe.includes('BANANA') || probe.includes('FRUIT')) return CATEGORY_FALLBACKS.FRUITS;
  if (probe.includes('CHILLI') || probe.includes('PEPPER') || probe.includes('SPICE')) return CATEGORY_FALLBACKS.SPICES;
  if (isOrganic) return CATEGORY_FALLBACKS.ORGANIC;
  return CATEGORY_FALLBACKS.DEFAULT;
}

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  title: string;
  description?: string;
  categoryId?: string;
  category?: { name: string };
  farmerPrice: number;
  priceUnit: string;
  quantityAvailable: number;
  quantityUnit: string;
  isAvailable: boolean;
  isOrganic: boolean;
  imageUrl?: string;
  createdAt?: string;
}

export default function FarmerProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'ACTIVE' | 'LOW_STOCK' | 'OUT_OF_STOCK'>('ALL');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchApi('/dashboard/farmer');
      const data = res?.data || res;
      setProducts(data.products || []);
      setCategories(data.categories || []);
    } catch (err: any) {
      console.error('Failed to load farmer produce:', err);
      setError(err.message || 'Could not load your crop inventory.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Quick toggle availability directly from catalog
  const toggleAvailability = async (prod: Product) => {
    try {
      await fetchApi(`/products/${prod.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...prod,
          isAvailable: !prod.isAvailable,
        }),
      });
      setProducts((prev) =>
        prev.map((p) => (p.id === prod.id ? { ...p, isAvailable: !p.isAvailable } : p))
      );
    } catch (err: any) {
      alert(err.message || 'Could not update produce status.');
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      const matchesSearch = prod.title.toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return false;

      if (selectedCategory !== 'ALL' && prod.categoryId !== selectedCategory) {
        return false;
      }

      if (stockFilter === 'ACTIVE') return prod.isAvailable && prod.quantityAvailable > 0;
      if (stockFilter === 'LOW_STOCK') return prod.quantityAvailable > 0 && prod.quantityAvailable <= 50;
      if (stockFilter === 'OUT_OF_STOCK') return prod.quantityAvailable === 0 || !prod.isAvailable;

      return true;
    });
  }, [products, search, selectedCategory, stockFilter]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Top Banner */}
      <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-stone-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-600" /> Karnataka Mandi Catalog
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 text-[10px] font-bold">
              Farmer Inventory
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
            Active Produce & Harvest Lots
          </h1>
          <p className="text-stone-500 text-xs sm:text-sm mt-0.5">
            Manage your crop inventory, update wholesale pricing, and publish new yields to the marketplace.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="p-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-2xl transition-colors"
            title="Refresh Inventory"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-6 py-3.5 bg-gradient-to-r from-emerald-800 to-emerald-700 hover:from-emerald-900 hover:to-emerald-800 text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center gap-2 shadow-lg shadow-emerald-950/10 transition-all active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[3]" /> List New Harvest
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search produce name or crop..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-stone-50 rounded-xl text-xs font-semibold text-stone-900 border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-600 transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-800 outline-none focus:ring-2 focus:ring-emerald-600"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Stock Filter Chips */}
          <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl">
            {(['ALL', 'ACTIVE', 'LOW_STOCK', 'OUT_OF_STOCK'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setStockFilter(mode)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all ${
                  stockFilter === mode
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {mode.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      {loading ? (
        <div className="min-h-[45vh] flex flex-col items-center justify-center text-emerald-800 gap-3">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="font-bold tracking-widest text-xs uppercase text-stone-500">
            Fetching Produce Records...
          </span>
        </div>
      ) : error ? (
        <div className="bg-white rounded-3xl border border-red-200 p-8 text-center max-w-md mx-auto space-y-3 shadow-xs">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
          <h3 className="font-bold text-stone-900">Failed to Load Produce</h3>
          <p className="text-xs text-stone-500">{error}</p>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-emerald-800 text-white font-bold text-xs rounded-xl hover:bg-emerald-900 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white/80 rounded-3xl border border-dashed border-stone-300 p-12 text-center text-stone-500 max-w-md mx-auto space-y-4">
          <Package className="w-12 h-12 text-stone-300 mx-auto" />
          <div>
            <h3 className="font-bold text-stone-900 text-base">No Matching Produce Found</h3>
            <p className="text-xs text-stone-500 mt-1">
              {search || selectedCategory !== 'ALL' || stockFilter !== 'ALL'
                ? 'Try resetting your search or filters.'
                : "You haven't listed any crops yet. List your first harvest to start receiving orders."}
            </p>
          </div>
          {(search || selectedCategory !== 'ALL' || stockFilter !== 'ALL') ? (
            <button
              onClick={() => { setSearch(''); setSelectedCategory('ALL'); setStockFilter('ALL'); }}
              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl transition-colors"
            >
              Clear Filters
            </button>
          ) : (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-5 py-2.5 bg-emerald-800 text-white font-bold text-xs rounded-xl hover:bg-emerald-900 transition-all shadow-sm"
            >
              List First Crop
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((prod) => {
            const fallbackImg = resolveFallback(prod.title, prod.category?.name, prod.isOrganic);
            const isLowStock = prod.quantityAvailable > 0 && prod.quantityAvailable <= 50;
            const isOutOfStock = prod.quantityAvailable === 0;

            return (
              <div
                key={prod.id}
                className="bg-white rounded-3xl border border-stone-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
              >
                <div>
                  {/* Image Container */}
                  <div className="h-48 w-full bg-stone-100 relative overflow-hidden">
                    <img
                      src={prod.imageUrl || fallbackImg}
                      alt={prod.title}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = fallbackImg;
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    {prod.isOrganic && (
                      <span className="absolute top-3 left-3 bg-emerald-800/90 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-xs">
                        Organic
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => toggleAvailability(prod)}
                      className={`absolute top-3 right-3 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-xs transition-colors flex items-center gap-1 ${
                        prod.isAvailable
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 hover:bg-emerald-200'
                          : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
                      }`}
                    >
                      {prod.isAvailable ? <CheckCircle2 className="w-3 h-3 text-emerald-700" /> : <XCircle className="w-3 h-3 text-stone-500" />}
                      {prod.isAvailable ? 'Market Active' : 'Hidden'}
                    </button>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 space-y-3">
                    <div>
                      <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider block">
                        {prod.category?.name || 'Produce'}
                      </span>
                      <h3 className="font-bold text-stone-900 text-base line-clamp-1 mt-0.5" title={prod.title}>
                        {prod.title}
                      </h3>
                      <p className="text-xs text-stone-500 line-clamp-2 mt-1">
                        {prod.description || 'Farm-fresh yield direct from harvest fields.'}
                      </p>
                    </div>

                    {/* Pricing & Stock Readout */}
                    <div className="flex justify-between items-center bg-stone-50 p-3 rounded-2xl border border-stone-200/80">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-stone-400 block">Listed Rate</span>
                        <span className="text-xl font-black text-stone-900">₹{prod.farmerPrice}</span>
                        <span className="text-[11px] text-stone-500">/{prod.priceUnit.replace('PER_', '').toLowerCase()}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold uppercase text-stone-400 block">Stock Level</span>
                        <span className={`text-sm font-black ${
                          isOutOfStock ? 'text-red-600' : isLowStock ? 'text-amber-600' : 'text-emerald-800'
                        }`}>
                          {prod.quantityAvailable} {prod.quantityUnit}
                        </span>
                        {isLowStock && <span className="block text-[9px] font-bold text-amber-600">Low Inventory</span>}
                        {isOutOfStock && <span className="block text-[9px] font-bold text-red-600">Out of Stock</span>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div className="p-5 pt-0 flex items-center gap-2 border-t border-stone-100 pt-3">
                  <button
                    type="button"
                    onClick={() => setEditingProduct(prod)}
                    className="flex-1 py-2.5 bg-stone-100 hover:bg-emerald-50 text-stone-700 hover:text-emerald-900 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors border border-stone-200"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-stone-500" /> Edit Produce
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeletingProduct(prod)}
                    className="p-2.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl transition-colors border border-red-200"
                    title="Delete Crop"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Edit Modal */}
      {editingProduct && (
        <EditHarvestModal
          crop={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSuccess={() => { setEditingProduct(null); loadData(); }}
        />
      )}

      {/* Add Modal */}
      {isAddModalOpen && (
        <AddHarvestModal
          categories={categories}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => { setIsAddModalOpen(false); loadData(); }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingProduct && (
        <DeleteModal
          crop={deletingProduct}
          onClose={() => setDeletingProduct(null)}
          onSuccess={() => { setDeletingProduct(null); loadData(); }}
        />
      )}

    </div>
  );
}

// ============================================================================
// MODALS
// ============================================================================

function EditHarvestModal({
  crop,
  onClose,
  onSuccess,
}: {
  crop: Product;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    title: crop.title,
    description: crop.description || '',
    farmerPrice: crop.farmerPrice.toString(),
    priceUnit: crop.priceUnit || 'PER_KG',
    quantityAvailable: crop.quantityAvailable.toString(),
    quantityUnit: crop.quantityUnit || 'KG',
    isAvailable: crop.isAvailable,
    isOrganic: crop.isOrganic,
    imageUrl: crop.imageUrl || '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetchApi(`/products/${crop.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...form,
          farmerPrice: parseFloat(form.farmerPrice),
          quantityAvailable: parseFloat(form.quantityAvailable),
          imageUrl: form.imageUrl.trim() || null,
        }),
      });
      onSuccess();
    } catch (err: any) {
      alert(err.message || 'Failed to update produce.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-xl shadow-2xl border border-stone-200 max-h-[92vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-stone-900">Modify Produce</h3>
              <p className="text-xs text-stone-500">Update rates, stocks, and description.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-stone-100 hover:bg-stone-200 rounded-full text-stone-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase mb-1">Crop Title *</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold focus:ring-2 focus:ring-emerald-600 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase mb-1">Price (₹) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={form.farmerPrice}
                onChange={(e) => setForm({ ...form, farmerPrice: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold focus:ring-2 focus:ring-emerald-600 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase mb-1">Price Unit</label>
              <select
                value={form.priceUnit}
                onChange={(e) => setForm({ ...form, priceUnit: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold focus:ring-2 focus:ring-emerald-600 outline-none bg-white"
              >
                <option value="PER_KG">Per KG</option>
                <option value="PER_QUINTAL">Per Quintal</option>
                <option value="PER_TON">Per Tonne</option>
                <option value="PER_DOZEN">Per Dozen</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase mb-1">Available Stock *</label>
              <input
                type="number"
                step="0.1"
                required
                value={form.quantityAvailable}
                onChange={(e) => setForm({ ...form, quantityAvailable: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold focus:ring-2 focus:ring-emerald-600 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase mb-1">Stock Unit</label>
              <select
                value={form.quantityUnit}
                onChange={(e) => setForm({ ...form, quantityUnit: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold focus:ring-2 focus:ring-emerald-600 outline-none bg-white"
              >
                <option value="KG">KG</option>
                <option value="QUINTAL">Quintals</option>
                <option value="TON">Tonnes</option>
                <option value="DOZEN">Dozen</option>
                <option value="CRATES">Crates</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase mb-1">Image URL</label>
            <input
              type="text"
              value={form.imageUrl}
              placeholder="Paste direct URL (PNG, JPG, WebP)"
              onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold focus:ring-2 focus:ring-emerald-600 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <label className="flex items-center gap-2.5 p-3 rounded-xl border border-stone-200 cursor-pointer bg-stone-50 hover:bg-stone-100">
              <input
                type="checkbox"
                checked={form.isAvailable}
                onChange={(e) => setForm({ ...form, isAvailable: e.target.checked })}
                className="w-4 h-4 text-emerald-700 rounded border-stone-300"
              />
              <span className="text-xs font-bold text-stone-800">Available on Marketplace</span>
            </label>

            <label className="flex items-center gap-2.5 p-3 rounded-xl border border-emerald-200 cursor-pointer bg-emerald-50 hover:bg-emerald-100">
              <input
                type="checkbox"
                checked={form.isOrganic}
                onChange={(e) => setForm({ ...form, isOrganic: e.target.checked })}
                className="w-4 h-4 text-emerald-700 rounded border-emerald-300"
              />
              <span className="text-xs font-bold text-emerald-950">100% Certified Organic</span>
            </label>
          </div>

          <div className="flex gap-3 pt-4 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 bg-emerald-800 hover:bg-emerald-900 disabled:bg-stone-300 text-white font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Modifications'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddHarvestModal({
  categories,
  onClose,
  onSuccess,
}: {
  categories: Category[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    categoryId: '',
    farmerPrice: '',
    priceUnit: 'PER_KG',
    quantityAvailable: '',
    quantityUnit: 'KG',
    isOrganic: false,
    imageUrl: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetchApi('/products', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          farmerPrice: parseFloat(form.farmerPrice),
          quantityAvailable: parseFloat(form.quantityAvailable),
          imageUrl: form.imageUrl.trim() || null,
        }),
      });
      onSuccess();
    } catch (err: any) {
      alert(err.message || 'Failed to list produce.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-xl shadow-2xl border border-stone-200 max-h-[92vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
              <Sprout className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-stone-900">List Fresh Harvest</h3>
              <p className="text-xs text-stone-500">Publish your crop for consumer and wholesale buying.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-stone-100 hover:bg-stone-200 rounded-full text-stone-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase mb-1">Crop Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Hassan Fresh Ginger"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold focus:ring-2 focus:ring-emerald-600 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase mb-1">Category *</label>
            <select
              required
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold focus:ring-2 focus:ring-emerald-600 outline-none bg-white"
            >
              <option value="">Select category...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase mb-1">Price (₹) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={form.farmerPrice}
                onChange={(e) => setForm({ ...form, farmerPrice: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold focus:ring-2 focus:ring-emerald-600 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase mb-1">Price Unit</label>
              <select
                value={form.priceUnit}
                onChange={(e) => setForm({ ...form, priceUnit: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold focus:ring-2 focus:ring-emerald-600 outline-none bg-white"
              >
                <option value="PER_KG">Per KG</option>
                <option value="PER_QUINTAL">Per Quintal</option>
                <option value="PER_TON">Per Tonne</option>
                <option value="PER_DOZEN">Per Dozen</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase mb-1">Stock Amount *</label>
              <input
                type="number"
                step="0.1"
                required
                value={form.quantityAvailable}
                onChange={(e) => setForm({ ...form, quantityAvailable: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold focus:ring-2 focus:ring-emerald-600 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase mb-1">Stock Unit</label>
              <select
                value={form.quantityUnit}
                onChange={(e) => setForm({ ...form, quantityUnit: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold focus:ring-2 focus:ring-emerald-600 outline-none bg-white"
              >
                <option value="KG">KG</option>
                <option value="QUINTAL">Quintals</option>
                <option value="TON">Tonnes</option>
                <option value="DOZEN">Dozen</option>
                <option value="CRATES">Crates</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase mb-1">Image Link (Optional)</label>
            <input
              type="text"
              value={form.imageUrl}
              placeholder="https://... (Leave blank for automated fallback image)"
              onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold focus:ring-2 focus:ring-emerald-600 outline-none"
            />
          </div>

          <label className="flex items-center gap-2.5 p-3 rounded-xl border border-emerald-200 cursor-pointer bg-emerald-50 hover:bg-emerald-100">
            <input
              type="checkbox"
              checked={form.isOrganic}
              onChange={(e) => setForm({ ...form, isOrganic: e.target.checked })}
              className="w-4 h-4 text-emerald-700 rounded border-emerald-300"
            />
            <span className="text-xs font-bold text-emerald-950">100% Certified Organic Produce</span>
          </label>

          <div className="flex gap-3 pt-4 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 bg-emerald-800 hover:bg-emerald-900 disabled:bg-stone-300 text-white font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-md"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Publish Harvest'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteModal({
  crop,
  onClose,
  onSuccess,
}: {
  crop: Product;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await fetchApi(`/products/${crop.id}`, { method: 'DELETE' });
      onSuccess();
    } catch (err: any) {
      alert(err.message || 'Failed to remove harvest.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl border border-stone-200 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center mx-auto">
          <AlertCircle className="w-7 h-7" />
        </div>
        <div>
          <h3 className="text-lg font-black text-stone-900">Remove from Catalog?</h3>
          <p className="text-xs text-stone-500 mt-1">
            Are you sure you want to remove <strong>{crop.title}</strong>? Buyers will no longer see or purchase this harvest lot.
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl"
          >
            Keep Listing
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 py-3 bg-red-600 hover:bg-red-700 disabled:bg-stone-300 text-white font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5"
          >
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Yes, Remove'}
          </button>
        </div>
      </div>
    </div>
  );
}