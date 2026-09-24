'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  Search, 
  Filter, 
  Sprout, 
  MapPin, 
  Package, 
  ShoppingCart, 
  Loader2, 
  Sparkles, 
  Check, 
  IndianRupee,
  RefreshCw 
} from 'lucide-react';
import { useCart } from '../../../context/CartContext';
import { fetchApi } from '../../../lib/api';

const FALLBACK_SEED_CROPS = [
  {
    id: 'seed-1',
    title: 'Tomato (Nati Desi)',
    description: 'Fresh desi heirloom tomatoes from Mandya farms.',
    farmerPrice: 22,
    priceUnit: 'PER_KG',
    quantityAvailable: 2500,
    quantityUnit: 'KG',
    isOrganic: true,
    location: 'Pandavapura, Mandya',
    farmer: { farmName: 'Mandya Green Orchards' },
    imageUrl: 'https://images.unsplash.com/photo-1597362925123-77861d3fbac7?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'seed-2',
    title: 'Finger Millet (Mandya Ragi)',
    description: 'Traditional organic brown ragi grains.',
    farmerPrice: 42,
    priceUnit: 'PER_KG',
    quantityAvailable: 6000,
    quantityUnit: 'KG',
    isOrganic: true,
    location: 'Srirangapatna, Mandya',
    farmer: { farmName: 'Cauvery Organic Collective' },
    imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'seed-3',
    title: 'Yelakki Banana (Elakki Bale)',
    description: 'Naturally ripened GI-tagged sweet miniature bananas.',
    farmerPrice: 65,
    priceUnit: 'PER_KG',
    quantityAvailable: 450,
    quantityUnit: 'KG',
    isOrganic: false,
    location: 'Nanjangud, Mysuru',
    farmer: { farmName: 'Mysuru Native Groves' },
    imageUrl: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'seed-4',
    title: 'Byadgi Red Chilli (Stemless)',
    description: 'High-color pungency dried red chillies from Haveri.',
    farmerPrice: 350,
    priceUnit: 'PER_KG',
    quantityAvailable: 850,
    quantityUnit: 'KG',
    isOrganic: false,
    location: 'Byadgi, Haveri',
    farmer: { farmName: 'Tungabhadra Spice Farms' },
    imageUrl: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=800&q=80',
  },
];

export default function ConsumerExplorePage() {
  const { addToCart } = useCart();

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [organicOnly, setOrganicOnly] = useState(false);
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});

  const fetchCrops = async () => {
    setLoading(true);

    try {
      const res = await fetchApi('/products');
      const data = res?.data || res?.products || (Array.isArray(res) ? res : []);
      if (Array.isArray(data) && data.length > 0) {
        setProducts(data);
      } else {
        setProducts(FALLBACK_SEED_CROPS);
      }
    } catch {
      // Graceful fallback to seed produce on network failure
      setProducts(FALLBACK_SEED_CROPS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCrops();
  }, []);

  const handleAddToCart = (product: any) => {
    const success = addToCart({
      id: product.id,
      productId: product.id,
      title: product.title,
      farmerId: product.farmerId || 'farmer_1',
      farmName: product.farmer?.farmName || 'Karnataka Farm',
      farmerPrice: Number(product.farmerPrice) || 20,
      priceUnit: product.priceUnit || 'PER_KG',
      quantityUnit: product.quantityUnit || 'KG',
      availableStock: Number(product.quantityAvailable) || 1000,
      imageUrl: product.imageUrl,
    }, 10);

    if (success) {
      setAddedIds((prev) => ({ ...prev, [product.id]: true }));
      setTimeout(() => {
        setAddedIds((prev) => ({ ...prev, [product.id]: false }));
      }, 1500);
    }
  };

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        (p.title || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.location || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.description || '').toLowerCase().includes(search.toLowerCase());

      const matchesOrganic = !organicOnly || p.isOrganic;
      return matchesSearch && matchesOrganic;
    });
  }, [products, search, organicOnly]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-stone-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-950 border border-emerald-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
              <Sprout className="w-3.5 h-3.5 text-emerald-700" /> Direct Farm Marketplace
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-stone-900 tracking-tight">
            Karnataka Fresh Harvest Lots
          </h1>
          <p className="text-stone-500 text-xs sm:text-sm mt-1 max-w-2xl">
            Procure authentic agricultural commodities directly from local cultivators with zero broker markups.
          </p>
        </div>

        <button
          onClick={fetchCrops}
          className="p-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-2xl transition-colors self-start md:self-auto"
          title="Refresh Produce"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filter Controls */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search crop, variety, or district..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-stone-50 rounded-xl text-xs font-semibold text-stone-900 border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-600 transition-all"
          />
        </div>

        <button
          type="button"
          onClick={() => setOrganicOnly((prev) => !prev)}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            organicOnly
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" /> Certified Organic Only
        </button>
      </div>

      {/* Grid or Circular Loader */}
      {loading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-700" />
          <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">
            Connecting to Karnataka Farm Yards...
          </span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center max-w-md mx-auto space-y-3">
          <Package className="w-10 h-10 text-stone-300 mx-auto" />
          <h3 className="text-sm font-black text-stone-900">No Produce Listings Found</h3>
          <p className="text-xs text-stone-500">Try modifying your search or clearing the organic filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filtered.map((product) => {
            const isAdded = addedIds[product.id];

            return (
              <div
                key={product.id}
                className="bg-white rounded-3xl border border-stone-200/90 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="h-44 w-full bg-stone-100 relative overflow-hidden">
                    <img
                      src={product.imageUrl || 'https://images.unsplash.com/photo-1597362925123-77861d3fbac7?auto=format&fit=crop&w=800&q=80'}
                      alt={product.title}
                      className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                    />
                    {product.isOrganic && (
                      <span className="absolute top-3 left-3 bg-emerald-800/90 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full">
                        Organic
                      </span>
                    )}
                  </div>

                  <div className="p-5 space-y-2">
                    <h3 className="text-base font-black text-stone-900 tracking-tight">
                      {product.title}
                    </h3>
                    <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed">
                      {product.description}
                    </p>
                    <div className="flex items-center gap-1 text-[11px] text-stone-400 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      <span className="truncate">{product.location || 'Karnataka'}</span>
                    </div>
                  </div>
                </div>

                <div className="p-5 pt-0">
                  <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-stone-400 uppercase block">Direct Price</span>
                      <span className="text-lg font-black text-emerald-800 block">
                        ₹{product.farmerPrice} <span className="text-xs font-normal text-stone-500">/ kg</span>
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAddToCart(product)}
                      className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 active:scale-95 ${
                        isAdded
                          ? 'bg-emerald-700 text-white'
                          : 'bg-emerald-800 hover:bg-emerald-900 text-white shadow-xs'
                      }`}
                    >
                      {isAdded ? (
                        <>
                          <Check className="w-3.5 h-3.5" /> Added
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="w-3.5 h-3.5" /> Add Lot
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