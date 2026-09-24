'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { ShoppingBag, Sprout, MapPin, Sparkles, ShieldCheck } from 'lucide-react';
import { useSocket } from '../../hooks/useSocket';

// ============================================================================
// CATEGORY FALLBACK REGISTRY
// ============================================================================
const CROP_FALLBACK_IMAGES: Record<string, string> = {
  GRAINS: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=800&q=80',
  MILLETS: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80',
  VEGETABLES: 'https://images.unsplash.com/photo-1597362925123-77861d3fbac7?auto=format&fit=crop&w=800&q=80',
  FRUITS: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=800&q=80',
  SPICES: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=800&q=80',
  ORGANIC: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80',
  DEFAULT: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=800&q=80',
};

function resolveCropFallback(title: string, categoryName?: string, isOrganic?: boolean): string {
  if (isOrganic) return CROP_FALLBACK_IMAGES.ORGANIC;
  const probe = `${title} ${categoryName || ''}`.toUpperCase();
  if (probe.includes('RICE') || probe.includes('WHEAT') || probe.includes('GRAIN')) return CROP_FALLBACK_IMAGES.GRAINS;
  if (probe.includes('RAGI') || probe.includes('MILLET') || probe.includes('JOWAR')) return CROP_FALLBACK_IMAGES.MILLETS;
  if (probe.includes('TOMATO') || probe.includes('ONION') || probe.includes('POTATO') || probe.includes('VEG')) return CROP_FALLBACK_IMAGES.VEGETABLES;
  if (probe.includes('MANGO') || probe.includes('BANANA') || probe.includes('FRUIT')) return CROP_FALLBACK_IMAGES.FRUITS;
  if (probe.includes('CHILLI') || probe.includes('PEPPER') || probe.includes('SPICE')) return CROP_FALLBACK_IMAGES.SPICES;
  return CROP_FALLBACK_IMAGES.DEFAULT;
}

export interface ProductCardProps {
  product: {
    id: string;
    title: string;
    description?: string;
    category?: { name: string };
    farmerPrice: number;
    priceUnit: string;
    quantityAvailable: number;
    quantityUnit: string;
    isOrganic: boolean;
    imageUrl?: string;
    farmerId?: string;
    farmer: {
      id?: string;
      farmName: string;
      district: string;
    };
    distanceKm?: number | null;
  };
}

export const ProductCard: React.FC<ProductCardProps> = ({ product: initialData }) => {
  const [product, setProduct] = useState(initialData);
  const [priceFlash, setPriceFlash] = useState(false);
  const socket = useSocket();

  const farmerId = product.farmerId || product.farmer?.id;

  // Fallback image handling
  const fallbackUrl = useMemo(
    () => resolveCropFallback(product.title, product.category?.name, product.isOrganic),
    [product.title, product.category?.name, product.isOrganic]
  );
  const [imageSrc, setImageSrc] = useState<string>(
    product.imageUrl && product.imageUrl.trim() !== '' ? product.imageUrl : fallbackUrl
  );
  const [imageErrored, setImageErrored] = useState(false);

  // Sync imageSrc if prop updates
  useEffect(() => {
    setImageSrc(product.imageUrl && product.imageUrl.trim() !== '' ? product.imageUrl : fallbackUrl);
    setImageErrored(false);
  }, [product.imageUrl, fallbackUrl]);

  // Real-time socket updates for price and stock
  useEffect(() => {
    if (!socket) return;
    socket.emit('join_product_room', product.id);

    socket.on('product_updated', (updated: any) => {
      if (updated.productId === product.id) {
        setProduct((prev) => ({
          ...prev,
          farmerPrice: updated.farmerPrice,
          quantityAvailable: updated.quantityAvailable,
        }));
        setPriceFlash(true);
        setTimeout(() => setPriceFlash(false), 2000);
      }
    });

    return () => {
      socket.emit('leave_product_room', product.id);
      socket.off('product_updated');
    };
  }, [socket, product.id]);

  return (
    <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-stone-200/80 overflow-hidden shadow-xs hover:shadow-xl hover:border-emerald-300 transition-all duration-300 flex flex-col justify-between group">
      <div>
        {/* Visual Crop Media with Fallback Guard */}
        <div className="relative h-52 w-full bg-stone-100 overflow-hidden">
          <img
            src={imageSrc}
            alt={product.title}
            onError={() => {
              if (!imageErrored) {
                setImageErrored(true);
                setImageSrc(fallbackUrl);
              }
            }}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          />

          {/* Organic Verification Badge */}
          {product.isOrganic && (
            <span className="absolute top-3 left-3 bg-emerald-800/90 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-md flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-300" />
              100% Organic
            </span>
          )}

          {/* Location / Distance Indicator */}
          {product.distanceKm !== undefined && product.distanceKm !== null && (
            <span className="absolute bottom-3 right-3 bg-stone-950/80 backdrop-blur-md text-white text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-md">
              <MapPin className="w-3 h-3 text-emerald-400" />
              {product.distanceKm} km away
            </span>
          )}
        </div>

        {/* Harvest Information */}
        <div className="p-5 space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
            <Sprout className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate">{product.farmer.farmName} • {product.farmer.district}</span>
          </div>

          <h3 className="font-black text-stone-900 text-lg tracking-tight line-clamp-1 group-hover:text-emerald-900 transition-colors">
            {product.title}
          </h3>

          <div className="pt-2">
            <div className="flex items-baseline justify-between bg-stone-50/80 border border-stone-200/70 p-3.5 rounded-2xl">
              <div>
                <span className="text-[10px] uppercase font-black text-stone-400 block tracking-wider">
                  Farmer Listed Price
                </span>
                <div className="flex items-baseline gap-1">
                  <span
                    className={`text-2xl font-black transition-colors duration-500 ${
                      priceFlash ? 'text-amber-600 animate-pulse' : 'text-stone-900'
                    }`}
                  >
                    ₹{Number(product.farmerPrice)}
                  </span>
                  <span className="text-xs text-stone-500 font-bold">
                    /{product.priceUnit.replace('PER_', '').toLowerCase()}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-black text-stone-400 block tracking-wider">
                  Stock Available
                </span>
                <span className="text-sm font-black text-emerald-800">
                  {Number(product.quantityAvailable)} {product.quantityUnit.toLowerCase()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Area: Redirects directly to Farmer Wholesale Profile */}
      <div className="p-5 pt-0">
        <Link
          href={`/consumer/farmer/${farmerId}`}
          className="w-full py-3.5 bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 group-hover:shadow-emerald-950/10 group-hover:shadow-md"
        >
          <ShoppingBag className="w-4 h-4" />
          Buy Wholesale Lot
        </Link>
      </div>
    </div>
  );
};