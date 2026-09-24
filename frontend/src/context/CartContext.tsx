'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { calculateDistanceKm } from '../lib/utils';
import { fetchApi } from '../lib/api';

export interface CartItem {
  id?: string;
  productId: string;
  title: string;
  farmerId: string;
  farmName: string;
  farmerPrice: number;
  priceUnit: string;
  quantity: number;
  quantityUnit: string;
  unit?: string;
  availableStock: number;
  containerType?: 'STANDARD_CRATE' | 'COLD_CHAIN_REFRIGERATED' | 'MOISTURE_CONTROLLED' | 'VENTILATED_JUTE';
  containerCostPerKg?: number;
  imageUrl?: string;
  farmerLat?: number;
  farmerLon?: number;
}

export type AddToCartItem = Omit<CartItem, 'quantity' | 'productId' | 'priceUnit' | 'quantityUnit' | 'availableStock'> & {
  productId?: string;
  id?: string;
  quantity?: number;
  unit?: string;
  priceUnit?: string;
  quantityUnit?: string;
  availableStock?: number;
};

export interface DestinationCoords {
  latitude: number;
  longitude: number;
  address: string;
}

export interface CartContextType {
  items: CartItem[];
  cart: CartItem[];
  isHydrated: boolean;
  activeFarmerId: string | null;
  activeFarmName: string | null;
  destination: DestinationCoords | null;
  totalItemsCost: number;
  subtotal: number;
  totalWeightKg: number;
  containerCost: number;
  transportCost: number;
  grandTotal: number;
  totalItemsCount: number;
  distanceKm: number;
  addToCart: (item: AddToCartItem, quantity?: number) => boolean;
  updateQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  setDeliveryDestination: (dest: DestinationCoords | null) => void;
  refreshFreightQuote: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'fc_cart_session_v2';
const DEST_STORAGE_KEY = 'fc_cart_dest_v2';

const BASE_FREIGHT_FLAT = 150;
const FREIGHT_PER_KM_PER_QUINTAL = 1.85;

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [destination, setDestination] = useState<DestinationCoords | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate cart and destination from localStorage on initial client mount
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const savedCart = localStorage.getItem(CART_STORAGE_KEY);
        const savedDest = localStorage.getItem(DEST_STORAGE_KEY);

        if (savedCart) {
          const parsed = JSON.parse(savedCart);
          if (Array.isArray(parsed)) {
            setItems(parsed);
          }
        }
        if (savedDest) {
          setDestination(JSON.parse(savedDest));
        }
      }
    } catch (err) {
      console.warn('Could not hydrate shopping cart from browser storage:', err);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // Sync state changes back to localStorage
  useEffect(() => {
    if (!isHydrated || typeof window === 'undefined') return;

    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
      if (destination) {
        localStorage.setItem(DEST_STORAGE_KEY, JSON.stringify(destination));
      } else {
        localStorage.removeItem(DEST_STORAGE_KEY);
      }
    } catch (err) {
      console.warn('Failed to save cart state to browser storage:', err);
    }
  }, [items, destination, isHydrated]);

  const activeFarmerId = items[0]?.farmerId || null;
  const activeFarmName = items[0]?.farmName || null;

  const addToCart = useCallback((product: AddToCartItem, quantity = 1): boolean => {
    const resolvedProductId = product.productId || product.id || '';
    if (!resolvedProductId) {
      console.error('Product must provide either an id or productId.');
      return false;
    }

    const resolvedAvailableStock = Math.max(0, Number(product.availableStock ?? 9999));
    if (resolvedAvailableStock <= 0) {
      if (typeof window !== 'undefined') {
        alert('This crop listing is currently out of stock.');
      }
      return false;
    }

    const resolvedPriceUnit = product.priceUnit || product.unit || 'PER_KG';
    const resolvedQuantityUnit = product.quantityUnit || product.unit || 'KG';
    const requestedQty = Math.max(1, Number(product.quantity ?? quantity ?? 1));
    const resolvedQuantity = Math.min(requestedQty, resolvedAvailableStock);

    const safeFarmerPrice = Math.max(0, Number(product.farmerPrice) || 0);
    const safeContainerCost = Number(product.containerCostPerKg) || 0.45;

    const normalizedItem: CartItem = {
      ...product,
      productId: resolvedProductId,
      id: resolvedProductId,
      farmerPrice: safeFarmerPrice,
      priceUnit: resolvedPriceUnit,
      quantityUnit: resolvedQuantityUnit,
      unit: product.unit || resolvedPriceUnit,
      availableStock: resolvedAvailableStock,
      containerType: product.containerType || 'STANDARD_CRATE',
      containerCostPerKg: safeContainerCost,
      quantity: resolvedQuantity,
    };

    // Single-farmer validation performed outside setState to prevent double-prompts
    if (items.length > 0 && items[0].farmerId !== normalizedItem.farmerId) {
      if (typeof window !== 'undefined') {
        const confirmSwitch = window.confirm(
          `Your cart already contains harvest from ${items[0].farmName || 'another farmer'}. Clear your cart to order from ${normalizedItem.farmName || 'this farmer'} instead?`
        );
        if (!confirmSwitch) {
          return false;
        }
      }
      setItems([{ ...normalizedItem, quantity: resolvedQuantity }]);
      return true;
    }

    setItems((prev) => {
      const existingIndex = prev.findIndex(
        (i) => (i.productId || i.id) === resolvedProductId
      );

      if (existingIndex > -1) {
        const updated = [...prev];
        const newQty = Math.min(
          updated[existingIndex].quantity + resolvedQuantity,
          normalizedItem.availableStock
        );
        updated[existingIndex] = { ...updated[existingIndex], quantity: newQty };
        return updated;
      }

      return [...prev, normalizedItem];
    });

    return true;
  }, [items]);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    const numericQty = Number(quantity);
    if (isNaN(numericQty) || numericQty <= 0) {
      setItems((prev) => prev.filter((i) => (i.productId || i.id) !== productId));
      return;
    }

    setItems((prev) =>
      prev.map((item) => {
        if ((item.productId || item.id) === productId) {
          const clampedQty = Math.min(numericQty, item.availableStock);
          return { ...item, quantity: clampedQty };
        }
        return item;
      })
    );
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => (i.productId || i.id) !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const setDeliveryDestination = useCallback((dest: DestinationCoords | null) => {
    setDestination(dest);
  }, []);

  const totalWeightKg = useMemo(() => {
    return items.reduce((acc, item) => {
      const unit = (item.quantityUnit || item.unit || 'KG').toUpperCase();
      const qty = Number(item.quantity) || 0;
      let weightInKg = qty;
      if (unit.includes('QUINTAL')) weightInKg = qty * 100;
      if (unit.includes('TON')) weightInKg = qty * 1000;
      return acc + weightInKg;
    }, 0);
  }, [items]);

  const totalItemsCost = useMemo(() => {
    return items.reduce((acc, item) => {
      const price = Number(item.farmerPrice) || 0;
      const qty = Number(item.quantity) || 0;
      return acc + price * qty;
    }, 0);
  }, [items]);

  const containerCost = useMemo(() => {
    return items.reduce((acc, item) => {
      const unit = (item.quantityUnit || item.unit || 'KG').toUpperCase();
      const qty = Number(item.quantity) || 0;
      let itemWeight = qty;
      if (unit.includes('QUINTAL')) itemWeight = qty * 100;
      if (unit.includes('TON')) itemWeight = qty * 1000;
      const ratePerKg = Number(item.containerCostPerKg) || 0.45;
      return acc + itemWeight * ratePerKg;
    }, 0);
  }, [items]);

  const distanceKm = useMemo(() => {
    if (!destination || items.length === 0) return 0;
    const originLat = typeof items[0].farmerLat === 'number' ? items[0].farmerLat : 12.5218;
    const originLon = typeof items[0].farmerLon === 'number' ? items[0].farmerLon : 76.8951;
    return Math.round(
      calculateDistanceKm(originLat, originLon, destination.latitude, destination.longitude)
    );
  }, [destination, items]);

  const transportCost = useMemo(() => {
    if (items.length === 0) return 0;
    if (distanceKm === 0) return BASE_FREIGHT_FLAT;
    const quintals = Math.max(1, totalWeightKg / 100);
    return Math.round((BASE_FREIGHT_FLAT + distanceKm * FREIGHT_PER_KM_PER_QUINTAL * quintals) * 100) / 100;
  }, [items, distanceKm, totalWeightKg]);

  const grandTotal = useMemo(() => {
    return Math.round((totalItemsCost + transportCost + containerCost) * 100) / 100;
  }, [totalItemsCost, transportCost, containerCost]);

  const totalItemsCount = useMemo(() => {
    return items.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);
  }, [items]);

  const refreshFreightQuote = useCallback(async () => {
    if (!destination || items.length === 0) return;
    try {
      await fetchApi('/logistics/quote', {
        method: 'POST',
        body: JSON.stringify({
          cropQuantityKg: totalWeightKg,
          originLat: items[0].farmerLat,
          originLon: items[0].farmerLon,
          destLat: destination.latitude,
          destLon: destination.longitude,
          containerType: items[0].containerType,
        }),
      });
    } catch {
      // Retains local geometric fallback calculations cleanly
    }
  }, [destination, items, totalWeightKg]);

  return (
    <CartContext.Provider
      value={{
        items,
        cart: items,
        isHydrated,
        activeFarmerId,
        activeFarmName,
        destination,
        totalItemsCost,
        subtotal: totalItemsCost,
        totalWeightKg,
        containerCost,
        transportCost,
        grandTotal,
        totalItemsCount,
        distanceKm,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        setDeliveryDestination,
        refreshFreightQuote,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export default CartContext;