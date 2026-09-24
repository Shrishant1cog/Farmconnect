'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  Sprout, Package, MessageSquare, Plus, 
  MapPin, IndianRupee, Scale, Edit3, Trash2, 
  Search, X, ArrowUpRight, ArrowRight, CheckCircle2 
} from 'lucide-react';
import { fetchApi } from '../../../lib/api';
import { useAuth } from '../../../hooks/useAuth';

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

interface Product {
  id: string;
  title: string;
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

const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    title: 'Tomato (Nati Desi Heirloom)',
    description: 'Fresh early-morning picked harvest packed in 25kg ventilated plastic crates.',
    categoryName: 'Vegetables',
    farmerPrice: 20,
    mandiBenchmark: 22,
    priceUnit: 'kg',
    quantityAvailable: 2400,
    quantityUnit: 'kg',
    minOrderKg: 50,
    isAvailable: true,
    grade: 'Grade-A Export',
    location: 'Pandavapura, Mandya',
  },
  {
    id: 'prod-2',
    title: 'Mandya Brown Finger Millet (Ragi)',
    description: 'MR-1 Desi Variety, machine cleaned, sun-dried, de-stoned, ready for bulk flour milling.',
    categoryName: 'Grains & Millets',
    farmerPrice: 42,
    mandiBenchmark: 40,
    priceUnit: 'kg',
    quantityAvailable: 5800,
    quantityUnit: 'kg',
    minOrderKg: 100,
    isAvailable: true,
    grade: 'Residue Free',
    location: 'Srirangapatna, Mandya',
  },
  {
    id: 'prod-3',
    title: 'Yelakki Banana (Elakki Bale)',
    description: 'Naturally ripened local sweet bananas harvested in optimal maturity bunches.',
    categoryName: 'Fruits',
    farmerPrice: 65,
    mandiBenchmark: 62,
    priceUnit: 'kg',
    quantityAvailable: 320,
    quantityUnit: 'kg',
    minOrderKg: 20,
    isAvailable: true,
    grade: 'Grade-A Export',
    location: 'Nanjangud, Mysuru',
  },
  {
    id: 'prod-4',
    title: 'Byadgi Stemless Red Chilli',
    description: 'Deep red, high-capsanthin graded kaddi chilli bundles with zero stems.',
    categoryName: 'Spices',
    farmerPrice: 350,
    mandiBenchmark: 365,
    priceUnit: 'kg',
    quantityAvailable: 850,
    quantityUnit: 'kg',
    minOrderKg: 10,
    isAvailable: false,
    grade: 'Grade-A Export',
    location: 'Byadgi, Haveri',
  },
];

const DEFAULT_LEADS: BuyerChatLead[] = [
  {
    id: 'lead-1',
    buyerName: 'Priya Narayanan (Bengaluru Consumer)',
    buyerPhone: '+91 98765 43211',
    cropTopic: 'Tomato (Nati Desi)',
    lastMessage: 'Can you dispatch 250 kg by 5 AM truck to Bengaluru depot?',
    time: '10:22 AM',
    quotedPrice: 20,
    unread: true,
  },
  {
    id: 'lead-2',
    buyerName: 'Suresh Gowda (Retail Merchant)',
    buyerPhone: '+91 98765 43222',
    cropTopic: 'Mandya Brown Ragi',
    lastMessage: 'Requested lab residue test documentation for 500kg procurement.',
    time: 'Yesterday',
    quotedPrice: 42,
    unread: false,
  },
  {
    id: 'lead-3',
    buyerName: 'Hotel Nisarga Greens (Direct Procurement)',
    buyerPhone: '+91 98765 43233',
    cropTopic: 'Yelakki Banana',
    lastMessage: 'Agreed on 50kg crate consignment delivery schedule.',
    time: 'Sep 15',
    quotedPrice: 65,
    unread: false,
  },
];

function SafeImage({ src, alt, title, categoryName, className }: { 
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
// 2. MAIN FARMER DASHBOARD COMPONENT (NO RESTRICTION MODALS)
// ============================================================================

export default function FarmerDashboardPage() {
  const { user: authUser } = useAuth() as any;

  // Immediate session hydration to ensure instant zero-latency loading
  const [currentUser, setCurrentUser] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('farmconnect_user');
        if (stored) return JSON.parse(stored);
      } catch {
        // ignore
      }
    }
    return null;
  });

  useEffect(() => {
    if (authUser) {
      setCurrentUser(authUser);
    }
  }, [authUser]);

  const [products, setProducts] = useState<Product[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('farmconnect_farmer_products');
        if (stored) return JSON.parse(stored);
      } catch {
        // ignore
      }
    }
    return DEFAULT_PRODUCTS;
  });

  const [leads] = useState<BuyerChatLead[]>(DEFAULT_LEADS);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'ACTIVE' | 'SOLD_OUT'>('ALL');

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  const syncProducts = (updated: Product[]) => {
    setProducts(updated);
    try {
      localStorage.setItem('farmconnect_farmer_products', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const toggleAvailability = (id: string) => {
    const updated = products.map((p) => (p.id === id ? { ...p, isAvailable: !p.isAvailable } : p));
    syncProducts(updated);
  };

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            p.location.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
      if (filterMode === 'ACTIVE') return p.isAvailable;
      if (filterMode === 'SOLD_OUT') return !p.isAvailable;
      return true;
    });
  }, [products, searchQuery, filterMode]);

  const stats = useMemo(() => {
    const totalLots = products.length;
    const activeLots = products.filter((p) => p.isAvailable).length;
    const totalKg = products.reduce((sum, p) => sum + (p.isAvailable ? p.quantityAvailable : 0), 0);
    const grossPotential = products.reduce((sum, p) => sum + (p.isAvailable ? p.quantityAvailable * p.farmerPrice : 0), 0);

    return {
      activeLots,
      totalLots,
      totalTonnes: (totalKg / 1000).toFixed(1),
      grossValuation: grossPotential.toLocaleString(),
      unreadLeads: leads.filter((l) => l.unread).length,
    };
  }, [products, leads]);

  const farmerName = currentUser?.name || authUser?.name || 'Ramesh Kumar (Cultivator)';
  const farmerDistrict = currentUser?.district || authUser?.district || 'Mandya';
  const farmerTaluk = currentUser?.taluk || authUser?.taluk || 'Pandavapura';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-200">
      
      {/* 1. Header Banner */}
      <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-stone-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-950 border border-emerald-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
              <Sprout className="w-3.5 h-3.5 text-emerald-700" /> Cultivator Command Center
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 text-[10px] font-bold flex items-center gap-1">
              <MapPin className="w-3 h-3 text-emerald-700" /> {farmerTaluk}, {farmerDistrict}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
            Welcome, {farmerName}
          </h1>
          <p className="text-stone-500 text-xs sm:text-sm mt-1 max-w-xl">
            Direct farm-gate trade: update crop quantities, review incoming buyer trade messages, and compare your gate rates directly with APMC modal market rates.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="px-5 py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center gap-2 shadow-lg shadow-emerald-950/15 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" /> List New Harvest
          </button>
        </div>
      </div>

      {/* 2. Analytical KPI Stream */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-stone-500">Active Crop Lots</span>
            <Package className="w-4 h-4 text-emerald-700" />
          </div>
          <p className="text-3xl font-black text-stone-900">{stats.activeLots} / {stats.totalLots}</p>
          <span className="text-xs text-stone-500 mt-1 block">Lots open for buyer procurement</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-stone-500">Harvest Volume</span>
            <Scale className="w-4 h-4 text-emerald-700" />
          </div>
          <p className="text-3xl font-black text-stone-900">{stats.totalTonnes} MT</p>
          <span className="text-xs text-stone-500 mt-1 block">In-stock weight across all plots</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-stone-500">Gross Gate Valuation</span>
            <IndianRupee className="w-4 h-4 text-emerald-700" />
          </div>
          <p className="text-3xl font-black text-emerald-800">₹{stats.grossValuation}</p>
          <span className="text-xs text-stone-500 mt-1 block">Zero broker deduction potential</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-stone-500">Trade Chats</span>
            <MessageSquare className="w-4 h-4 text-emerald-700" />
          </div>
          <p className="text-3xl font-black text-stone-900">{leads.length} Inquiries</p>
          <span className="text-xs text-emerald-700 font-bold mt-1 block">{stats.unreadLeads} unread buyer negotiations</span>
        </div>
      </div>

      {/* 3. Main Split View: Produce Inventory & Buyer Trade Chats */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left: Active Harvest Inventory (8 Columns) */}
        <div className="lg:col-span-8 space-y-4">
          
          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by crop name or plot location..."
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
                  {mode === 'ALL' ? 'All Crops' : mode.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

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
                  <div className="p-5 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block">
                          {prod.categoryName} • {prod.grade}
                        </span>
                        <h3 className="font-bold text-stone-900 text-base line-clamp-1">{prod.title}</h3>
                      </div>
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        prod.isAvailable ? 'bg-emerald-100 text-emerald-900' : 'bg-stone-200 text-stone-700'
                      }`}>
                        {prod.isAvailable ? 'Active' : 'Sold Out'}
                      </span>
                    </div>

                    <p className="text-xs text-stone-500 line-clamp-2">{prod.description}</p>

                    <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-stone-400 uppercase block">Your Gate Rate</span>
                        <span className="text-lg font-black text-emerald-800">₹{prod.farmerPrice}/{prod.priceUnit}</span>
                        <span className="text-[10px] text-stone-500 block">Min order: {prod.minOrderKg} kg</span>
                      </div>
                      <div className="border-l border-stone-200 pl-2">
                        <span className="text-[10px] font-bold text-stone-400 uppercase block">APMC Modal Rate</span>
                        <span className="text-lg font-black text-stone-700">₹{prod.mandiBenchmark}/{prod.priceUnit}</span>
                        <span className={`text-[10px] font-bold block ${isUnderMandi ? 'text-emerald-700' : 'text-amber-700'}`}>
                          {isUnderMandi ? 'Competitive vs Mandi' : 'Premium Grade'}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-xs text-stone-600 pt-1">
                      <span>Stock: <strong className="text-stone-900 font-bold">{prod.quantityAvailable} {prod.quantityUnit}</strong></span>
                      <span className="flex items-center gap-1 text-[11px] text-stone-500">
                        <MapPin className="w-3 h-3 text-emerald-700" /> {prod.location}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 bg-stone-50/80 border-t border-stone-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => toggleAvailability(prod.id)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-colors ${
                        prod.isAvailable
                          ? 'bg-white border-stone-200 text-stone-700 hover:bg-stone-100'
                          : 'bg-emerald-800 border-emerald-800 text-white hover:bg-emerald-900'
                      }`}
                    >
                      {prod.isAvailable ? 'Mark Sold Out' : 'Mark In Stock'}
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingProduct(prod)}
                        className="p-2 text-stone-400 hover:text-emerald-800 hover:bg-emerald-50 rounded-xl transition-colors"
                        title="Edit Harvest Details"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingProduct(prod)}
                        className="p-2 text-stone-400 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors"
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

        </div>

        {/* Right: Buyer Trade Chats with Incoming Messages (4 Columns) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-800" />
                <h3 className="text-sm font-black uppercase tracking-wider text-stone-900">
                  Buyer Inquiries & Chats
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-black uppercase">
                {stats.unreadLeads} Active
              </span>
            </div>

            <p className="text-xs text-stone-500">
              Direct incoming messages from retail and commercial buyers discussing crate specs, pickup logistics, and price quotations.
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
                      Target Rate: ₹{lead.quotedPrice}/kg
                    </span>
                    <Link
                      href="/farmer/chats"
                      className="px-2.5 py-1 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-[10px] uppercase tracking-wider rounded-lg flex items-center gap-1 transition-all"
                    >
                      Reply to Buyer <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            <Link
              href="/farmer/chats"
              className="w-full py-3 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5"
            >
              Open Cultivator Chat Inbox <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

      </div>

      {/* Modals */}
      {editingProduct && (
        <div className="fixed inset-0 bg-stone-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full border border-stone-200 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-stone-100">
              <h3 className="text-base font-black text-stone-900">Modify Crop Lot</h3>
              <button type="button" onClick={() => setEditingProduct(null)} className="p-1 text-stone-400 hover:text-stone-700 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const updated = products.map((p) => p.id === editingProduct.id ? editingProduct : p);
                syncProducts(updated);
                setEditingProduct(null);
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-bold text-stone-700 uppercase mb-1">Crop Title</label>
                <input
                  type="text"
                  required
                  value={editingProduct.title}
                  onChange={(e) => setEditingProduct({ ...editingProduct, title: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-semibold outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 uppercase mb-1">Gate Rate (₹/kg)</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={editingProduct.farmerPrice}
                    onChange={(e) => setEditingProduct({ ...editingProduct, farmerPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-semibold outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 uppercase mb-1">Stock Amount (kg)</label>
                  <input
                    type="number"
                    required
                    value={editingProduct.quantityAvailable}
                    onChange={(e) => setEditingProduct({ ...editingProduct, quantityAvailable: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-semibold outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="flex-1 py-2.5 bg-stone-100 text-stone-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-800 text-white font-black uppercase tracking-wider rounded-xl shadow-xs"
                >
                  Save Modifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAddModalOpen && (
        <div className="fixed inset-0 bg-stone-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full border border-stone-200 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-stone-100">
              <h3 className="text-base font-black text-stone-900">List Fresh Harvest Lot</h3>
              <button type="button" onClick={() => setIsAddModalOpen(false)} className="p-1 text-stone-400 hover:text-stone-700 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as any;
                const newLot: Product = {
                  id: `prod-${Date.now()}`,
                  title: form.title.value.trim(),
                  description: form.description.value.trim(),
                  categoryName: form.categoryName.value,
                  farmerPrice: parseFloat(form.farmerPrice.value) || 20,
                  mandiBenchmark: parseFloat(form.farmerPrice.value) * 1.05,
                  priceUnit: 'kg',
                  quantityAvailable: parseFloat(form.quantityAvailable.value) || 100,
                  quantityUnit: 'kg',
                  minOrderKg: parseFloat(form.minOrderKg.value) || 25,
                  isAvailable: true,
                  grade: form.grade.value,
                  location: `${farmerTaluk}, ${farmerDistrict}`,
                };
                syncProducts([newLot, ...products]);
                setIsAddModalOpen(false);
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-bold text-stone-700 uppercase mb-1">Crop Title *</label>
                <input
                  name="title"
                  type="text"
                  required
                  placeholder="e.g. Hassan Fresh Ginger, Mandya Cabbage"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-semibold outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 uppercase mb-1">Category</label>
                  <select
                    name="categoryName"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-semibold outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    <option value="Vegetables">Vegetables</option>
                    <option value="Fruits">Fruits</option>
                    <option value="Grains & Millets">Grains & Millets</option>
                    <option value="Spices">Spices</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-stone-700 uppercase mb-1">Quality Grade</label>
                  <select
                    name="grade"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-semibold outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    <option value="Grade-A Export">Grade-A Export</option>
                    <option value="Standard Market">Standard Market</option>
                    <option value="Residue Free">Residue Free</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 uppercase mb-1">Rate (₹/kg) *</label>
                  <input
                    name="farmerPrice"
                    type="number"
                    step="0.5"
                    required
                    placeholder="25"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-semibold outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 uppercase mb-1">Stock (kg) *</label>
                  <input
                    name="quantityAvailable"
                    type="number"
                    required
                    placeholder="1000"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-semibold outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 uppercase mb-1">Min Order *</label>
                  <input
                    name="minOrderKg"
                    type="number"
                    required
                    placeholder="50"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-semibold outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 uppercase mb-1">Consignment Description</label>
                <textarea
                  name="description"
                  rows={2}
                  placeholder="Packing details, crate type, sorting standards..."
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-semibold outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 bg-stone-100 text-stone-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-800 text-white font-black uppercase tracking-wider rounded-xl shadow-xs"
                >
                  Publish Harvest Lot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deletingProduct && (
        <div className="fixed inset-0 bg-stone-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-sm w-full border border-stone-200 shadow-2xl text-center space-y-4">
            <div>
              <h3 className="text-base font-black text-stone-900">Remove Harvest Lot?</h3>
              <p className="text-xs text-stone-500 mt-1">
                Are you sure you want to remove <strong>{deletingProduct.title}</strong>? Buyers will no longer be able to submit trade inquiries for this batch.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingProduct(null)}
                className="flex-1 py-2.5 bg-stone-100 text-stone-700 font-bold rounded-xl text-xs"
              >
                Keep Listing
              </button>
              <button
                type="button"
                onClick={() => {
                  const updated = products.filter((p) => p.id !== deletingProduct.id);
                  syncProducts(updated);
                  setDeletingProduct(null);
                }}
                className="flex-1 py-2.5 bg-red-700 hover:bg-red-800 text-white font-black uppercase tracking-wider rounded-xl text-xs shadow-xs"
              >
                Yes, Remove
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}