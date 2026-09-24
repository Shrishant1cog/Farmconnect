'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
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
  Scale
} from 'lucide-react';
import { useCart } from '../../../context/CartContext';
import { useModal } from '../../../context/ModalContext';
import { fetchApi } from '../../../lib/api';

const FALLBACK_SEED_CROPS = [
  {
    id: 'seed-1',
    farmerId: 'farmer-mandya-1',
    title: 'Tomato (Nati Desi)',
    description: 'Fresh desi heirloom tomatoes cultivated along the Cauvery basin in Mandya.',
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
    farmerId: 'farmer-cauvery-2',
    title: 'Finger Millet (Mandya Ragi)',
    description: 'Traditional organic brown ragi grains harvested and shade-dried.',
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
    farmerId: 'farmer-mysuru-3',
    title: 'Yelakki Banana (Elakki Bale)',
    description: 'Naturally ripened GI-tagged sweet miniature bananas direct from farm trees.',
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
    farmerId: 'farmer-haveri-4',
    title: 'Byadgi Red Chilli (Stemless)',
    description: 'High-color pungency dried red chillies sourced directly from Haveri growers.',
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
  const { addToCart, items = [], clearCart } = useCart() as any;
  const { confirm, alert } = useModal();

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
      setProducts(FALLBACK_SEED_CROPS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCrops();
  }, []);

  const handleAddToCart = async (product: any) => {
    const targetFarmerId = product.farmerId || product.farmer?.id || 'farmer_generic';
    const targetFarmName = product.farmer?.farmName || product.farmName || 'Cultivator Farm';

    // Verify multi-farmer conflict and prompt with modern animated modal
    if (items && items.length > 0) {
      const activeFarmerId = items[0].farmerId;
      const activeFarmName = items[0].farmName || 'Current Farm';

      if (activeFarmerId && activeFarmerId !== targetFarmerId) {
        const replaceConfirmed = await confirm({
          title: 'Replace Cart Items?',
          message: `Your cart contains produce from "${activeFarmName}". Direct farmer logistics allows ordering from one farm per dispatch. Would you like to empty your cart and add this lot from "${targetFarmName}"?`,
          confirmText: 'Replace & Add',
          cancelText: 'Keep Existing Cart',
          type: 'cart',
        });

        if (!replaceConfirmed) {
          return;
        }

        if (typeof clearCart === 'function') {
          clearCart();
        }
      }
    }

    const payload = {
      id: product.id,
      productId: product.id,
      title: product.title,
      farmerId: targetFarmerId,
      farmName: targetFarmName,
      farmerPrice: Number(product.farmerPrice) || 20,
      priceUnit: product.priceUnit || 'PER_KG',
      quantityUnit: product.quantityUnit || 'KG',
      availableStock: Number(product.quantityAvailable) || 1000,
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
        title: 'Stock Limit Reached',
        message: 'Could not add more of this harvest lot. Maximum available quantity has been allocated.',
        type: 'warning',
      });
    }
  };

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        (p.title || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.location || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.description || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.farmer?.farmName || '').toLowerCase().includes(search.toLowerCase());

      const matchesOrganic = !organicOnly || p.isOrganic;
      return matchesSearch && matchesOrganic;
    });
  }, [products, search, organicOnly]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-950 border border-emerald-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
              <Sprout className="w-3.5 h-3.5 text-emerald-700" /> Direct Farm Marketplace
            </span>
            <span className="px-3 py-1 rounded-full bg-stone-100 text-stone-700 border border-stone-200 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Verified Cultivators
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-stone-900 tracking-tight">
            Karnataka Fresh Harvest Lots
          </h1>
          <p className="text-stone-500 text-xs sm:text-sm mt-1 max-w-2xl">
            Procure authentic agricultural commodities directly from local cultivators with transparent mandi benchmark pricing.
          </p>
        </div>

        <button
          onClick={fetchCrops}
          className="p-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-2xl transition-all active:scale-95 self-start md:self-auto border border-stone-200"
          title="Refresh Produce"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search crop, variety, district, or farm..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
            Certified Organic Only
          </button>
        </div>
      </div>

      {/* Produce Grid */}
      {loading ? (
        <div className="min-h-[45vh] bg-white rounded-3xl border border-stone-200 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-700" />
          <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">
            Connecting to Karnataka Farm Yards...
          </span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center max-w-md mx-auto space-y-3">
          <Package className="w-12 h-12 text-stone-300 mx-auto" />
          <h3 className="text-base font-black text-stone-900">No Produce Listings Found</h3>
          <p className="text-xs text-stone-500">
            No crops matched "{search}". Try searching another district or reset the organic filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filtered.map((product) => {
            const isAdded = addedIds[product.id];
            const farmName = product.farmer?.farmName || product.farmName || 'Karnataka Cultivator';

            return (
              <div
                key={product.id}
                className="bg-white rounded-3xl border border-stone-200/90 shadow-xs hover:border-emerald-300 hover:shadow-lg transition-all overflow-hidden flex flex-col justify-between group"
              >
                <div>
                  {/* Image Container with Badges */}
                  <div className="h-48 w-full bg-stone-100 relative overflow-hidden">
                    <img
                      src={product.imageUrl || 'https://images.unsplash.com/photo-1597362925123-77861d3fbac7?auto=format&fit=crop&w=800&q=80'}
                      alt={product.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={(e: any) => {
                        e.target.src = 'https://images.unsplash.com/photo-1597362925123-77861d3fbac7?auto=format&fit=crop&w=800&q=80';
                      }}
                    />

                    {/* Gradient Overlay for Legibility */}
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-950/40 via-transparent to-transparent pointer-events-none" />

                    {product.isOrganic && (
                      <span className="absolute top-3 left-3 bg-emerald-700/95 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-xs flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                        Organic
                      </span>
                    )}

                    <span className="absolute bottom-3 left-3 bg-stone-900/80 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1">
                      <Scale className="w-3 h-3 text-emerald-400" />
                      {product.quantityAvailable} {product.quantityUnit || 'KG'} available
                    </span>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                      {farmName}
                    </span>
                    <h3 className="text-base font-black text-stone-900 tracking-tight leading-snug">
                      {product.title}
                    </h3>
                    <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed">
                      {product.description}
                    </p>
                    <div className="flex items-center gap-1 text-[11px] text-stone-400 font-medium pt-1">
                      <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      <span className="truncate">{product.location || 'Karnataka'}</span>
                    </div>
                  </div>
                </div>

                {/* Footer Pricing & CTA */}
                <div className="p-5 pt-0">
                  <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                        Direct Farm Rate
                      </span>
                      <span className="text-lg font-black text-emerald-800 block leading-tight">
                        ₹{product.farmerPrice}
                        <span className="text-xs font-normal text-stone-500"> / kg</span>
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