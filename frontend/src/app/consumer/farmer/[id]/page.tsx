'use client';

import React, { useEffect, useState, use, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Sprout, 
  MapPin, 
  CheckCircle2, 
  Phone, 
  Mail, 
  PackageCheck, 
  ShoppingBag, 
  ArrowRight, 
  Loader2,
  Boxes,
  MessageSquare,
  ShieldCheck,
  Check,
  Plus,
  Minus,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { useCart } from '../../../../context/CartContext';
import { useAuth } from '../../../../hooks/useAuth';
import { fetchApi } from '../../../../lib/api';

interface ProductItem {
  id: string;
  title: string;
  description?: string;
  farmerPrice: number;
  priceUnit: string;
  quantityAvailable: number;
  quantityUnit: string;
  isOrganic: boolean;
  imageUrl?: string;
  category?: {
    name: string;
    slug: string;
  };
}

interface FarmerProfileData {
  id: string;
  farmName: string;
  district: string;
  addressLine?: string;
  latitude: number;
  longitude: number;
  isVerified: boolean;
  profileViews: number;
  user: {
    id: string;
    name: string;
    phone: string;
    email: string;
  };
  products: ProductItem[];
}

export default function FarmerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const farmerId = resolvedParams.id;
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { addToCart, clearCart } = useCart();

  const [farmer, setFarmer] = useState<FarmerProfileData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isStartingChat, setIsStartingChat] = useState<boolean>(false);
  const [wholesaleQuantities, setWholesaleQuantities] = useState<Record<string, number>>({});
  const [addedItemNotice, setAddedItemNotice] = useState<string | null>(null);

  const fetchFarmerProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchApi(`/farmers/${farmerId}`);
      if (res.success && res.data) {
        setFarmer(res.data);
        const initialQtys: Record<string, number> = {};
        (res.data.products || []).forEach((p: ProductItem) => {
          initialQtys[p.id] = p.quantityAvailable;
        });
        setWholesaleQuantities(initialQtys);
      }
    } catch (err) {
      console.error('Failed to load farmer profile:', err);
    } finally {
      setLoading(false);
    }
  }, [farmerId]);

  useEffect(() => {
    fetchFarmerProfile();
  }, [fetchFarmerProfile]);

  const products = useMemo(() => farmer?.products || [], [farmer]);

  // Dynamic calculation of total harvest stock and value
  const lotMetrics = useMemo(() => {
    const totalVal = products.reduce((acc, p) => acc + (p.farmerPrice * p.quantityAvailable), 0);
    const totalQty = products.reduce((acc, p) => acc + p.quantityAvailable, 0);
    return { totalVal, totalQty, totalLots: products.length };
  }, [products]);

  // Clean phone number for WhatsApp links
  const whatsappUrl = useMemo(() => {
    if (!farmer?.user?.phone) return null;
    const digits = farmer.user.phone.replace(/\D/g, '');
    const msg = encodeURIComponent(
      `Namaskara ${farmer.user.name}! I am looking at your farm catalog for "${farmer.farmName}" on FarmConnect and would like to negotiate whole harvest dispatch.`
    );
    return `https://wa.me/${digits}?text=${msg}`;
  }, [farmer]);

  // Handle direct in-app chat thread initiation
  const handleStartChatWithFarmer = async () => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/consumer/farmer/${farmerId}`);
      return;
    }

    if (!farmer) return;

    setIsStartingChat(true);
    try {
      const firstProduct = products[0];
      const res = await fetchApi('/enquiries', {
        method: 'POST',
        body: JSON.stringify({
          productId: firstProduct ? firstProduct.id : farmer.id,
          subject: `Bulk Trade Inquiry with ${farmer.farmName}`,
          message: `Namaskara! I am reviewing your harvest catalog on FarmConnect and would like to coordinate freight delivery.`,
        }),
      });

      if (res.success && res.data?.id) {
        router.push(`/consumer/enquiries/${res.data.id}`);
      } else {
        alert(res.message || 'Unable to establish chat room.');
      }
    } catch {
      alert('Network error connecting to negotiation thread.');
    } finally {
      setIsStartingChat(false);
    }
  };

  // Single Crop Add to Cart (stoppers & notifications)
  const handleAddToCart = (product: ProductItem) => {
    if (!farmer) return;
    const qty = wholesaleQuantities[product.id] || product.quantityAvailable;

    addToCart(
      {
        id: product.id,
        productId: product.id,
        farmerId: farmer.id,
        farmName: farmer.farmName,
        title: product.title,
        farmerPrice: product.farmerPrice,
        priceUnit: product.priceUnit,
        quantityUnit: product.quantityUnit,
        unit: product.priceUnit,
        availableStock: product.quantityAvailable,
        farmerLat: farmer.latitude,
        farmerLon: farmer.longitude,
        imageUrl: product.imageUrl,
      },
      qty
    );

    setAddedItemNotice(product.id);
    setTimeout(() => setAddedItemNotice(null), 2500);
  };

  // Express Single Crop Wholesale Checkout
  const handleBuyItemInWhole = (product: ProductItem) => {
    if (!farmer) return;
    clearCart();
    const qty = wholesaleQuantities[product.id] || product.quantityAvailable;

    addToCart(
      {
        id: product.id,
        productId: product.id,
        farmerId: farmer.id,
        farmName: farmer.farmName,
        title: product.title,
        farmerPrice: product.farmerPrice,
        priceUnit: product.priceUnit,
        quantityUnit: product.quantityUnit,
        unit: product.priceUnit,
        availableStock: product.quantityAvailable,
        farmerLat: farmer.latitude,
        farmerLon: farmer.longitude,
        imageUrl: product.imageUrl,
      },
      qty
    );
    router.push('/checkout');
  };

  // Express Procurement of ALL Listed Harvests
  const handleBuyEntireHarvestLot = () => {
    if (!farmer || products.length === 0) return;
    clearCart();

    products.forEach((prod) => {
      addToCart(
        {
          id: prod.id,
          productId: prod.id,
          farmerId: farmer.id,
          farmName: farmer.farmName,
          title: prod.title,
          farmerPrice: prod.farmerPrice,
          priceUnit: prod.priceUnit,
          quantityUnit: prod.quantityUnit,
          unit: prod.priceUnit,
          availableStock: prod.quantityAvailable,
          farmerLat: farmer.latitude,
          farmerLon: farmer.longitude,
          imageUrl: prod.imageUrl,
        },
        prod.quantityAvailable
      );
    });
    router.push('/checkout');
  };

  const updateLotQuantity = (productId: string, newQty: number, maxStock: number) => {
    const clamped = Math.max(1, Math.min(newQty, maxStock));
    setWholesaleQuantities((prev) => ({ ...prev, [productId]: clamped }));
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-emerald-800 gap-3">
        <Loader2 className="w-9 h-9 animate-spin text-emerald-800" />
        <span className="font-bold text-xs tracking-widest uppercase text-stone-500">
          Loading Cultivator Profile & Field Stock...
        </span>
      </div>
    );
  }

  if (!farmer) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-white border border-stone-200 rounded-3xl text-center shadow-sm space-y-4">
        <div className="w-14 h-14 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto text-stone-400">
          <Sprout className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-black text-stone-900">Cultivator Not Found</h2>
        <p className="text-stone-500 text-xs leading-relaxed">
          This cultivation lot profile is inactive, private, or has been temporarily delisted from the regional exchange.
        </p>
        <button 
          onClick={() => router.push('/consumer/explore')} 
          className="w-full py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-colors"
        >
          Return to Marketplace
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Farmer Profile Header Banner */}
      <div className="bg-white border border-stone-200/90 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        
        <div className="flex items-start gap-5">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-900 text-white flex items-center justify-center font-black text-3xl shadow-md shrink-0">
            {farmer.user?.name?.[0] || 'F'}
          </div>

          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
                {farmer.farmName}
              </h1>
              {farmer.isVerified && (
                <span className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-300 px-2.5 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" /> Verified Cultivator
                </span>
              )}
            </div>

            <p className="text-stone-600 text-xs sm:text-sm font-medium">
              Registered Cultivator: <strong className="text-stone-900">{farmer.user?.name}</strong>
            </p>

            <div className="flex flex-wrap gap-4 text-xs text-stone-500 pt-1">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                {farmer.district}, Karnataka
              </span>
              {farmer.user?.phone && (
                <a href={`tel:${farmer.user.phone}`} className="flex items-center gap-1.5 hover:text-emerald-800 transition-colors">
                  <Phone className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  {farmer.user.phone}
                </a>
              )}
              {farmer.user?.email && (
                <a href={`mailto:${farmer.user.email}`} className="flex items-center gap-1.5 hover:text-emerald-800 transition-colors">
                  <Mail className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  {farmer.user.email}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Valuation Summary & Negotiation CTAs */}
        <div className="flex flex-col sm:flex-row lg:flex-col gap-3 min-w-[290px] w-full lg:w-auto">
          {products.length > 0 && (
            <div className="bg-stone-50 border border-stone-200/90 p-5 rounded-2xl flex-1 space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-stone-500 block">
                Total Available Harvest Valuation
              </span>
              <p className="text-2xl font-black text-stone-900 leading-none">
                ₹{lotMetrics.totalVal.toLocaleString('en-IN')}
              </p>
              <p className="text-[11px] text-stone-500">
                Across {lotMetrics.totalLots} harvest lots ({lotMetrics.totalQty.toLocaleString('en-IN')} units total)
              </p>

              <button
                type="button"
                onClick={handleBuyEntireHarvestLot}
                className="w-full mt-2 py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95"
              >
                <Boxes className="w-4 h-4" /> Procure Entire Harvest Lot
              </button>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleStartChatWithFarmer}
              disabled={isStartingChat}
              className="flex-1 py-3 bg-white hover:bg-stone-50 border border-stone-200 text-stone-800 font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-colors shadow-xs"
            >
              {isStartingChat ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4 text-emerald-700" />}
              Direct Chat
            </button>

            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                title="Open WhatsApp Negotiation"
              >
                <ExternalLink className="w-4 h-4 text-emerald-800" />
              </a>
            )}
          </div>
        </div>

      </div>

      {/* Produce Grid */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-stone-900 flex items-center gap-2">
              <Sprout className="w-5 h-5 text-emerald-700" /> Harvested Produce Catalog
            </h2>
            <p className="text-stone-500 text-xs mt-0.5">
              Source farm-fresh harvests directly from {farmer.farmName} with no middleman markups.
            </p>
          </div>
          <span className="text-xs font-bold text-stone-500">
            {products.length} lot{products.length === 1 ? '' : 's'} available
          </span>
        </div>

        {products.length === 0 ? (
          <div className="bg-white border border-dashed border-stone-300 rounded-3xl p-12 text-center text-stone-500 space-y-2">
            <PackageCheck className="w-12 h-12 text-stone-300 mx-auto" />
            <h3 className="font-bold text-stone-800 text-base">No Active Harvest Lots Ready</h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              This farm has dispatched all currently harvested crops. Check back shortly for seasonal harvests.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => {
              const maxStock = product.quantityAvailable;
              const unit = product.quantityUnit || 'KG';
              const selectedQty = wholesaleQuantities[product.id] ?? maxStock;
              const calculatedLotPrice = product.farmerPrice * selectedQty;
              const isAdded = addedItemNotice === product.id;

              return (
                <div 
                  key={product.id} 
                  className="bg-white border border-stone-200/80 rounded-3xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Produce Image Banner */}
                    <div className="h-48 bg-stone-100 relative overflow-hidden">
                      <img 
                        src={product.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80'} 
                        alt={product.title} 
                        className="w-full h-full object-cover"
                      />
                      
                      {product.isOrganic && (
                        <span className="absolute top-3 left-3 bg-emerald-800 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-xs flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-emerald-300" /> Organic
                        </span>
                      )}

                      <span className="absolute bottom-3 right-3 bg-stone-900/80 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-lg">
                        Stock: {maxStock} {unit}
                      </span>
                    </div>

                    {/* Produce Metadata */}
                    <div className="p-5 space-y-4">
                      <div>
                        <h3 className="font-bold text-stone-900 text-base leading-snug">
                          {product.title}
                        </h3>
                        {product.description && (
                          <p className="text-xs text-stone-500 line-clamp-2 mt-1">
                            {product.description}
                          </p>
                        )}
                      </div>

                      <div className="flex justify-between items-baseline bg-stone-50 p-3.5 rounded-2xl border border-stone-200/70">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                            Direct Farm Rate
                          </span>
                          <div className="flex items-baseline gap-1">
                            <span className="text-xl font-black text-stone-900">₹{product.farmerPrice}</span>
                            <span className="text-xs text-stone-500">
                              / {product.priceUnit?.replace('PER_', '').toLowerCase()}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                            Lot Stock
                          </span>
                          <span className="text-xs font-black text-emerald-900">
                            {maxStock} {unit} Available
                          </span>
                        </div>
                      </div>

                      {/* Quantity Selector & Presets */}
                      <div className="space-y-2 pt-1">
                        <div className="flex justify-between items-center text-xs">
                          <label className="font-bold text-stone-700 uppercase tracking-wider text-[10px]">
                            Procurement Volume ({unit})
                          </label>
                          <span className="text-xs font-mono font-black text-stone-900">
                            {selectedQty} {unit}
                          </span>
                        </div>

                        {/* Increment / Decrement Stepper */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateLotQuantity(product.id, selectedQty - 10, maxStock)}
                            className="p-2.5 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-600 active:scale-95 transition-all"
                            title="Decrease 10"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>

                          <input
                            type="number"
                            min="1"
                            max={maxStock}
                            value={selectedQty}
                            onChange={(e) => updateLotQuantity(product.id, Number(e.target.value), maxStock)}
                            className="flex-1 py-2 px-3 text-center border border-stone-300 rounded-xl text-xs font-bold text-stone-900 outline-none focus:ring-2 focus:ring-emerald-700"
                          />

                          <button
                            type="button"
                            onClick={() => updateLotQuantity(product.id, selectedQty + 10, maxStock)}
                            className="p-2.5 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-600 active:scale-95 transition-all"
                            title="Increase 10"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Quick Presets */}
                        <div className="grid grid-cols-3 gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => updateLotQuantity(product.id, Math.max(1, Math.round(maxStock * 0.25)), maxStock)}
                            className="py-1 px-2 text-[10px] font-bold rounded-lg border border-stone-200 hover:bg-stone-100 text-stone-600 transition-colors"
                          >
                            25% Lot
                          </button>
                          <button
                            type="button"
                            onClick={() => updateLotQuantity(product.id, Math.max(1, Math.round(maxStock * 0.50)), maxStock)}
                            className="py-1 px-2 text-[10px] font-bold rounded-lg border border-stone-200 hover:bg-stone-100 text-stone-600 transition-colors"
                          >
                            50% Lot
                          </button>
                          <button
                            type="button"
                            onClick={() => updateLotQuantity(product.id, maxStock, maxStock)}
                            className="py-1 px-2 text-[10px] font-black rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                          >
                            100% Stock
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Lot Price Breakdown & Action Buttons */}
                  <div className="p-5 pt-0 space-y-3">
                    <div className="flex justify-between items-center text-xs pt-3 border-t border-stone-100">
                      <span className="text-stone-500 font-medium">Estimated Lot Subtotal:</span>
                      <span className="text-base font-black text-stone-900">
                        ₹{calculatedLotPrice.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleAddToCart(product)}
                        className={`py-3 px-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-95 border ${
                          isAdded
                            ? 'bg-emerald-100 border-emerald-300 text-emerald-900'
                            : 'bg-white hover:bg-stone-50 border-stone-200 text-stone-800'
                        }`}
                      >
                        {isAdded ? (
                          <><Check className="w-4 h-4 text-emerald-700" /> Added</>
                        ) : (
                          <><ShoppingBag className="w-4 h-4 text-emerald-800" /> Add to Cart</>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleBuyItemInWhole(product)}
                        className="py-3 px-3 bg-emerald-800 hover:bg-emerald-900 text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95"
                      >
                        Checkout <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}