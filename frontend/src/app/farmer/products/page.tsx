'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { 
  Plus, Search, Package, Sprout, TrendingUp, Edit3, 
  Trash2, CheckCircle2, AlertCircle, X, Layers, Scale, 
  IndianRupee, Calendar, Sparkles, Filter, RefreshCw, 
  ArrowUpRight, AlertTriangle 
} from 'lucide-react';
import { fetchApi } from '../../../lib/api';
import { useAuth } from '../../../hooks/useAuth';

export interface FarmerProduct {
  id: string;
  name: string;
  variety: string;
  category: 'Vegetables' | 'Fruits' | 'Grains & Millets' | 'Spices & Cash Crops' | 'Pulses';
  quantityKg: number;
  minOrderKg: number;
  pricePerKg: number;
  mandiBenchmarkPerKg: number;
  harvestDate: string;
  grade: 'Grade-A Export' | 'Standard Market' | 'Organic Certified';
  status: 'ACTIVE' | 'LOW_STOCK' | 'SOLD_OUT';
  location: string;
}

const INITIAL_SEED_PRODUCTS: FarmerProduct[] = [
  {
    id: 'prod-1',
    name: 'Tomato (Nati Desi)',
    variety: 'Heirloom Red',
    category: 'Vegetables',
    quantityKg: 2400,
    minOrderKg: 50,
    pricePerKg: 20,
    mandiBenchmarkPerKg: 22,
    harvestDate: '2026-09-08',
    grade: 'Grade-A Export',
    status: 'ACTIVE',
    location: 'Pandavapura, Mandya',
  },
  {
    id: 'prod-2',
    name: 'Finger Millet (Mandya Ragi)',
    variety: 'MR-1 Brown Desi',
    category: 'Grains & Millets',
    quantityKg: 5800,
    minOrderKg: 100,
    pricePerKg: 42,
    mandiBenchmarkPerKg: 40,
    harvestDate: '2026-08-25',
    grade: 'Organic Certified',
    status: 'ACTIVE',
    location: 'Srirangapatna, Mandya',
  },
  {
    id: 'prod-3',
    name: 'Yelakki Banana (Elakki Bale)',
    variety: 'Mysuru Native',
    category: 'Fruits',
    quantityKg: 320,
    minOrderKg: 20,
    pricePerKg: 65,
    mandiBenchmarkPerKg: 62,
    harvestDate: '2026-09-09',
    grade: 'Grade-A Export',
    status: 'LOW_STOCK',
    location: 'Nanjangud, Mysuru',
  },
  {
    id: 'prod-4',
    name: 'Byadgi Red Chilli',
    variety: 'Deep Red Kaddi (Stemless)',
    category: 'Spices & Cash Crops',
    quantityKg: 850,
    minOrderKg: 10,
    pricePerKg: 350,
    mandiBenchmarkPerKg: 365,
    harvestDate: '2026-08-15',
    grade: 'Grade-A Export',
    status: 'ACTIVE',
    location: 'Byadgi, Haveri',
  },
];

export default function FarmerProductsPage() {
  const { user } = useAuth();

  const [products, setProducts] = useState<FarmerProduct[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Unit display switcher: KG vs Quintal (100 kg)
  const [unitMode, setUnitMode] = useState<'KG' | 'QUINTAL'>('KG');

  // Modal controls
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<FarmerProduct | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    variety: '',
    category: 'Vegetables' as FarmerProduct['category'],
    quantityKg: '',
    minOrderKg: '',
    pricePerKg: '',
    mandiBenchmarkPerKg: '',
    harvestDate: new Date().toISOString().split('T')[0],
    grade: 'Grade-A Export' as FarmerProduct['grade'],
  });

  // Load from local storage or seed data
  useEffect(() => {
    const saved = localStorage.getItem('farmconnect_farmer_products');
    if (saved) {
      try {
        setProducts(JSON.parse(saved));
      } catch {
        setProducts(INITIAL_SEED_PRODUCTS);
      }
    } else {
      setProducts(INITIAL_SEED_PRODUCTS);
      localStorage.setItem('farmconnect_farmer_products', JSON.stringify(INITIAL_SEED_PRODUCTS));
    }
  }, []);

  const saveProducts = (updated: FarmerProduct[]) => {
    setProducts(updated);
    localStorage.setItem('farmconnect_farmer_products', JSON.stringify(updated));
  };

  // KPIs
  const stats = useMemo(() => {
    const totalLots = products.length;
    const totalWeightKg = products.reduce((acc, p) => acc + (p.status !== 'SOLD_OUT' ? p.quantityKg : 0), 0);
    const totalValue = products.reduce((acc, p) => acc + (p.status !== 'SOLD_OUT' ? p.quantityKg * p.pricePerKg : 0), 0);
    const activeLots = products.filter((p) => p.status === 'ACTIVE').length;

    return {
      totalLots,
      totalWeightTonnes: (totalWeightKg / 1000).toFixed(1),
      totalValue: totalValue.toLocaleString(),
      activeLots,
    };
  }, [products]);

  // Filter Pipeline
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch = 
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.variety.toLowerCase().includes(search.toLowerCase()) ||
        p.location.toLowerCase().includes(search.toLowerCase());

      const matchesCat = selectedCategory === 'ALL' || p.category === selectedCategory;
      const matchesStatus = selectedStatus === 'ALL' || p.status === selectedStatus;

      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [products, search, selectedCategory, selectedStatus]);

  // Handle Quick Status Toggle
  const toggleStockStatus = (id: string) => {
    const updated = products.map((p) => {
      if (p.id === id) {
        const nextStatus: FarmerProduct['status'] = 
          p.status === 'ACTIVE' ? 'SOLD_OUT' : 'ACTIVE';
        return { ...p, status: nextStatus };
      }
      return p;
    });
    saveProducts(updated);
  };

  // Delete product
  const handleDeleteProduct = (id: string) => {
    if (confirm('Are you sure you want to remove this active produce listing?')) {
      const updated = products.filter((p) => p.id !== id);
      saveProducts(updated);
    }
  };

  // Open Edit Modal
  const openEditModal = (p: FarmerProduct) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      variety: p.variety,
      category: p.category,
      quantityKg: p.quantityKg.toString(),
      minOrderKg: p.minOrderKg.toString(),
      pricePerKg: p.pricePerKg.toString(),
      mandiBenchmarkPerKg: p.mandiBenchmarkPerKg.toString(),
      harvestDate: p.harvestDate,
      grade: p.grade,
    });
    setIsModalOpen(true);
  };

  // Open New Listing Modal
  const openNewListingModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      variety: '',
      category: 'Vegetables',
      quantityKg: '',
      minOrderKg: '25',
      pricePerKg: '',
      mandiBenchmarkPerKg: '',
      harvestDate: new Date().toISOString().split('T')[0],
      grade: 'Grade-A Export',
    });
    setIsModalOpen(true);
  };

  // Save Modal Form
// Save Modal Form
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();

    const price = parseFloat(formData.pricePerKg) || 10;
    const mandiRate = parseFloat(formData.mandiBenchmarkPerKg) || price;
    const qty = parseFloat(formData.quantityKg) || 100;
    const minOrder = parseFloat(formData.minOrderKg) || 10;

    let computedStatus: FarmerProduct['status'] = 'ACTIVE';
    if (qty <= 0) computedStatus = 'SOLD_OUT';
    else if (qty < 200) computedStatus = 'LOW_STOCK';

    const userDistrict = (user as any)?.district || 'Mandya';

    if (editingProduct) {
      // Update existing
      const updated = products.map((p) => {
        if (p.id === editingProduct.id) {
          return {
            ...p,
            name: formData.name.trim(),
            variety: formData.variety.trim(),
            category: formData.category,
            quantityKg: qty,
            minOrderKg: minOrder,
            pricePerKg: price,
            mandiBenchmarkPerKg: mandiRate,
            harvestDate: formData.harvestDate,
            grade: formData.grade,
            status: computedStatus,
          };
        }
        return p;
      });
      saveProducts(updated);
    } else {
      // Create new
      const newProduct: FarmerProduct = {
        id: `prod-${Date.now()}`,
        name: formData.name.trim(),
        variety: formData.variety.trim(),
        category: formData.category,
        quantityKg: qty,
        minOrderKg: minOrder,
        pricePerKg: price,
        mandiBenchmarkPerKg: mandiRate,
        harvestDate: formData.harvestDate,
        grade: formData.grade,
        status: computedStatus,
        location: `${userDistrict}, Karnataka`,
      };
      saveProducts([newProduct, ...products]);
    }

    setIsModalOpen(false);
  };

  // Price & Quantity format helper
  const displayPrice = (pricePerKg: number) => {
    if (unitMode === 'QUINTAL') {
      return `₹${(pricePerKg * 100).toLocaleString()}/qtl`;
    }
    return `₹${pricePerKg}/kg`;
  };

  const displayQuantity = (kg: number) => {
    if (unitMode === 'QUINTAL') {
      return `${(kg / 100).toFixed(1)} Qtl`;
    }
    return `${kg.toLocaleString()} kg`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-200">
      
      {/* 1. Header Banner */}
      <div className="bg-white/90 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-stone-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-950 border border-emerald-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
              <Sprout className="w-3.5 h-3.5 text-emerald-700" /> Cultivator Inventory Control
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 text-[10px] font-bold">
              Direct-to-Buyer Pipeline
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-stone-900 tracking-tight">
            Active Produce & Harvest Lots
          </h1>
          <p className="text-stone-500 text-xs sm:text-sm mt-1 max-w-2xl">
            Manage your crop inventory, update wholesale dispatch quantities, and benchmark your direct gate prices against live APMC mandi auction modal rates.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="flex items-center bg-stone-100 p-1 rounded-2xl border border-stone-200">
            <button
              type="button"
              onClick={() => setUnitMode('KG')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                unitMode === 'KG'
                  ? 'bg-emerald-800 text-white shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              ₹ / KG
            </button>
            <button
              type="button"
              onClick={() => setUnitMode('QUINTAL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                unitMode === 'QUINTAL'
                  ? 'bg-emerald-800 text-white shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              ₹ / Quintal
            </button>
          </div>

          <button
            type="button"
            onClick={openNewListingModal}
            className="px-5 py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center gap-2 shadow-lg shadow-emerald-950/15 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" /> List New Harvest
          </button>
        </div>
      </div>

      {/* 2. Key Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-stone-500">Live Active Lots</span>
            <Layers className="w-4 h-4 text-emerald-700" />
          </div>
          <p className="text-3xl font-black text-stone-900">{stats.activeLots} Listings</p>
          <span className="text-xs text-stone-500 mt-1 block">
            {stats.totalLots} total registered crops
          </span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-stone-500">Harvest Volume</span>
            <Scale className="w-4 h-4 text-emerald-700" />
          </div>
          <p className="text-3xl font-black text-stone-900">{stats.totalWeightTonnes} MT</p>
          <span className="text-xs text-stone-500 mt-1 block">
            In-stock produce ready for dispatch
          </span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-stone-500">Inventory Valuation</span>
            <IndianRupee className="w-4 h-4 text-emerald-700" />
          </div>
          <p className="text-3xl font-black text-emerald-800">₹{stats.totalValue}</p>
          <span className="text-xs text-stone-500 mt-1 block">
            Gross direct farm-gate potential
          </span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-stone-500">Mandi Benchmark</span>
            <TrendingUp className="w-4 h-4 text-emerald-700" />
          </div>
          <p className="text-3xl font-black text-stone-900">0% Cartel Fee</p>
          <span className="text-xs text-stone-500 mt-1 block">
            Zero APMC agent commission deductions
          </span>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="bg-white/95 backdrop-blur-md p-5 rounded-3xl border border-stone-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative w-full md:flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by crop, variety, or village location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-stone-50 rounded-2xl text-xs font-semibold text-stone-900 border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-600 transition-all"
            />
          </div>

          <div className="w-full md:w-52">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-semibold text-stone-800 outline-none focus:ring-2 focus:ring-emerald-600"
            >
              <option value="ALL">All Stock Statuses</option>
              <option value="ACTIVE">Active in Stock</option>
              <option value="LOW_STOCK">Low Inventory (&lt;200kg)</option>
              <option value="SOLD_OUT">Sold Out / Off Season</option>
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-stone-100">
          <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mr-1">
            Filter Crop:
          </span>
          {['ALL', 'Vegetables', 'Fruits', 'Grains & Millets', 'Spices & Cash Crops', 'Pulses'].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedCategory === cat
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {cat === 'ALL' ? 'All Commodities' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Product Cards Grid */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center max-w-md mx-auto space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto border border-emerald-100">
            <Package className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-black text-stone-900">No Harvest Lots Found</h3>
            <p className="text-xs text-stone-500">
              You haven&apos;t listed any produce matching your current search criteria.
            </p>
          </div>
          <button
            type="button"
            onClick={openNewListingModal}
            className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-xs"
          >
            Create First Produce Listing
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => {
            const isUnderMandi = product.pricePerKg <= product.mandiBenchmarkPerKg;
            const isSoldOut = product.status === 'SOLD_OUT';

            return (
              <div 
                key={product.id}
                className={`bg-white rounded-3xl border transition-all duration-200 shadow-xs flex flex-col justify-between overflow-hidden ${
                  isSoldOut ? 'border-stone-200 opacity-70 bg-stone-50/50' : 'border-stone-200/90 hover:border-emerald-300 hover:shadow-md'
                }`}
              >
                {/* Card Top */}
                <div className="p-6 space-y-4">
                  {/* Category & Status */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {product.category}
                    </span>

                    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                      product.status === 'ACTIVE'
                        ? 'bg-emerald-100 text-emerald-800'
                        : product.status === 'LOW_STOCK'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-stone-200 text-stone-700'
                    }`}>
                      {product.status === 'ACTIVE' && <CheckCircle2 className="w-3 h-3" />}
                      {product.status === 'LOW_STOCK' && <AlertTriangle className="w-3 h-3" />}
                      {product.status.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Title */}
                  <div>
                    <h3 className="text-xl font-black text-stone-900 tracking-tight">
                      {product.name}
                    </h3>
                    <p className="text-xs text-stone-500 font-medium mt-0.5">
                      {product.variety} • <span className="text-stone-700 font-semibold">{product.grade}</span>
                    </p>
                  </div>

                  {/* Price Comparison Box */}
                  <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-stone-400 uppercase block">Your Gate Price</span>
                      <span className="text-xl font-black text-emerald-800 block mt-0.5">
                        {displayPrice(product.pricePerKg)}
                      </span>
                      <span className="text-[10px] font-medium text-emerald-600 block">
                        Min order: {product.minOrderKg} kg
                      </span>
                    </div>

                    <div className="border-l border-stone-200 pl-3">
                      <span className="text-[10px] font-bold text-stone-400 uppercase block">APMC Modal Benchmark</span>
                      <span className="text-xl font-black text-stone-700 block mt-0.5">
                        {displayPrice(product.mandiBenchmarkPerKg)}
                      </span>
                      <span className={`text-[10px] font-bold block ${isUnderMandi ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {isUnderMandi ? 'Competitive vs Mandi' : 'Premium Grade Rate'}
                      </span>
                    </div>
                  </div>

                  {/* Stock & Harvest Specs */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-stone-500 font-medium">Available Quantity:</span>
                      <strong className="text-stone-900 font-bold">{displayQuantity(product.quantityKg)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500 font-medium">Harvest Date:</span>
                      <strong className="text-stone-700 font-bold">{product.harvestDate}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500 font-medium">Plot Yard:</span>
                      <strong className="text-stone-700 font-bold truncate max-w-[160px]">{product.location}</strong>
                    </div>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="px-6 py-3.5 bg-stone-50/80 border-t border-stone-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => toggleStockStatus(product.id)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-colors ${
                      product.status === 'ACTIVE'
                        ? 'bg-white border-stone-200 text-stone-700 hover:bg-stone-100'
                        : 'bg-emerald-800 border-emerald-800 text-white hover:bg-emerald-900'
                    }`}
                  >
                    {product.status === 'ACTIVE' ? 'Mark Sold Out' : 'Mark In Stock'}
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(product)}
                      className="p-2 rounded-xl text-stone-400 hover:text-emerald-800 hover:bg-emerald-50 transition-colors"
                      title="Edit Produce Listing"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteProduct(product.id)}
                      className="p-2 rounded-xl text-stone-400 hover:text-red-700 hover:bg-red-50 transition-colors"
                      title="Delete Listing"
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

      {/* 5. Add / Edit Produce Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-stone-950/75 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-stone-200 shadow-2xl p-6 sm:p-8 space-y-6 max-h-[92vh] overflow-y-auto">
            
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-950">
                  {editingProduct ? 'Update Produce' : 'New Harvest Lot'}
                </span>
                <h2 className="text-2xl font-black text-stone-900 tracking-tight mt-1.5">
                  {editingProduct ? `Edit ${editingProduct.name}` : 'List Fresh Harvest'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="space-y-4">
              
              {/* Crop Name */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1.5">
                  Commodity Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tomato (Nati / Local), Mandya Ragi"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-900 outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              {/* Variety & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase mb-1.5">
                    Variety / Cultivar *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Desi Heirloom, MR-1"
                    value={formData.variety}
                    onChange={(e) => setFormData({ ...formData, variety: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-900 outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase mb-1.5">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-900 outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    <option value="Vegetables">Vegetables</option>
                    <option value="Fruits">Fruits</option>
                    <option value="Grains & Millets">Grains & Millets</option>
                    <option value="Spices & Cash Crops">Spices & Cash Crops</option>
                    <option value="Pulses">Pulses</option>
                  </select>
                </div>
              </div>

              {/* Quantity & Min Order */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase mb-1.5">
                    Available Quantity (in KG) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 1500"
                    value={formData.quantityKg}
                    onChange={(e) => setFormData({ ...formData, quantityKg: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-900 outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase mb-1.5">
                    Min Wholesale Order (KG) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 50"
                    value={formData.minOrderKg}
                    onChange={(e) => setFormData({ ...formData, minOrderKg: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-900 outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>

              {/* Price & Mandi Benchmark */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase mb-1.5">
                    Your Direct Price (₹ / KG) *
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    min="1"
                    placeholder="e.g. 24"
                    value={formData.pricePerKg}
                    onChange={(e) => setFormData({ ...formData, pricePerKg: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-900 outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase mb-1.5">
                    APMC Mandi Rate (₹ / KG)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="e.g. 26"
                    value={formData.mandiBenchmarkPerKg}
                    onChange={(e) => setFormData({ ...formData, mandiBenchmarkPerKg: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-900 outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>

              {/* Harvest Date & Quality Grade */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase mb-1.5">
                    Harvest Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.harvestDate}
                    onChange={(e) => setFormData({ ...formData, harvestDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-900 outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase mb-1.5">
                    Quality Grade
                  </label>
                  <select
                    value={formData.grade}
                    onChange={(e) => setFormData({ ...formData, grade: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-900 outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    <option value="Grade-A Export">Grade-A Export</option>
                    <option value="Standard Market">Standard Market</option>
                    <option value="Organic Certified">Organic Certified</option>
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5"
                >
                  {editingProduct ? 'Save Updates' : 'Publish Produce'} <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}