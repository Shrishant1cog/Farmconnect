'use client';

import React, { useEffect, useState } from 'react';
import { ProductCard } from '../../../components/cards/ProductCard';
import { Search, Filter, Sprout, MapPin, Sparkles, Loader2, ArrowUpDown } from 'lucide-react';

const CATEGORIES = ['All', 'Grains & Millets', 'Vegetables', 'Fruits', 'Spices', 'Organic'];

export default function ConsumerExplorePage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState<'price_asc' | 'price_desc' | 'stock'>('price_asc');

  useEffect(() => {
    const fetchCrops = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/products`);
        const json = await res.json();
        if (json.success) {
          setProducts(json.data || []);
        }
      } catch (err) {
        console.error('Failed to load products:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCrops();
  }, []);

  const filteredProducts = products
    .filter((p) => {
      const matchesSearch =
        p.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.farmer?.farmName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.farmer?.district?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCat =
        selectedCategory === 'All'
          ? true
          : selectedCategory === 'Organic'
          ? p.isOrganic
          : p.category?.name?.toLowerCase().includes(selectedCategory.toLowerCase());

      return matchesSearch && matchesCat;
    })
    .sort((a, b) => {
      if (sortBy === 'price_asc') return a.farmerPrice - b.farmerPrice;
      if (sortBy === 'price_desc') return b.farmerPrice - a.farmerPrice;
      if (sortBy === 'stock') return b.quantityAvailable - a.quantityAvailable;
      return 0;
    });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-8">
      {/* Hero Welcome Bar */}
      <div className="bg-white/90 border border-stone-200/80 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-black uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-emerald-700" /> Karnataka Direct Mandi Hub
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
            Fresh Harvests Direct From Cultivators
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 font-medium">
            Procure whole-harvest yields directly with transparent pricing and zero middleman commission.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="bg-stone-50 border border-stone-200 px-4 py-2.5 rounded-2xl text-center">
            <span className="text-[10px] font-bold uppercase text-stone-400 block tracking-wider">Active Harvests</span>
            <span className="text-xl font-black text-emerald-800">{products.length} Lots</span>
          </div>
        </div>
      </div>

      {/* Search, Categories, and Filters */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search native crops, mandi listings, or districts (Mandya, Hassan, Belagavi)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-2xl border border-stone-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white shadow-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="relative shrink-0">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="pl-9 pr-8 py-3 bg-white border border-stone-300 rounded-2xl text-xs font-bold text-stone-700 outline-none focus:ring-2 focus:ring-emerald-600 shadow-xs appearance-none"
              >
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="stock">Highest Stock</option>
              </select>
              <ArrowUpDown className="w-3.5 h-3.5 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-black tracking-wide transition-all whitespace-nowrap shadow-xs ${
                  active
                    ? 'bg-emerald-800 text-white shadow-emerald-900/20'
                    : 'bg-white/90 text-stone-700 hover:bg-stone-100 border border-stone-200'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Harvest Catalog Grid */}
      {loading ? (
        <div className="min-h-[50vh] flex flex-col items-center justify-center text-emerald-800 gap-3">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="font-bold text-xs uppercase tracking-wider">Syncing Live Mandi Harvests...</span>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-stone-300 p-12 text-center text-stone-500">
          <Sprout className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <h3 className="font-bold text-stone-800 text-base">No Matching Crops Found</h3>
          <p className="text-xs text-stone-500 mt-1">Try adjusting your search terms or category filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}