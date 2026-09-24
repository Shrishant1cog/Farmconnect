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
  unit?: string; // Legacy alias for backward compatibility
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

interface DestinationCoords {
  latitude: number;
  longitude: number;
  address: string;
}

export interface CartContextType {
  items: CartItem[];
  cart: CartItem[]; // Legacy alias for items
  activeFarmerId: string | null;
  activeFarmName: string | null;
  destination: DestinationCoords | null;
  totalItemsCost: number;
  subtotal: number; // Legacy alias for totalItemsCost
  totalWeightKg: number;
  containerCost: number;
  transportCost: number;
  grandTotal: number;
  totalItemsCount: number;
  distanceKm: number;
  addToCart: (item: AddToCartItem, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  setDeliveryDestination: (dest: DestinationCoords) => void;
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

  useEffect(() => {
    try {
      const savedCart = localStorage.getItem(CART_STORAGE_KEY);
      const savedDest = localStorage.getItem(DEST_STORAGE_KEY);
      if (savedCart) setItems(JSON.parse(savedCart));
      if (savedDest) setDestination(JSON.parse(savedDest));
    } catch {
      console.warn('Could not hydrate shopping cart from browser storage.');
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    if (destination) {
      localStorage.setItem(DEST_STORAGE_KEY, JSON.stringify(destination));
    } else {
      localStorage.removeItem(DEST_STORAGE_KEY);
    }
  }, [items, destination, isHydrated]);

  const activeFarmerId = items[0]?.farmerId || null;
  const activeFarmName = items[0]?.farmName || null;

  const addToCart = useCallback((product: AddToCartItem, quantity = 1) => {
    const resolvedProductId = product.productId || product.id || '';
    if (!resolvedProductId) {
      console.error('Product must provide either an id or productId.');
      return;
    }

    const resolvedPriceUnit = product.priceUnit || product.unit || 'PER_KG';
    const resolvedQuantityUnit = product.quantityUnit || product.unit || 'KG';
    const resolvedQuantity = product.quantity ?? quantity ?? 1;
    const resolvedAvailableStock = product.availableStock ?? 9999;

    const normalizedItem: CartItem = {
      ...product,
      productId: resolvedProductId,
      id: resolvedProductId,
      priceUnit: resolvedPriceUnit,
      quantityUnit: resolvedQuantityUnit,
      unit: product.unit || resolvedPriceUnit,
      availableStock: resolvedAvailableStock,
      containerType: product.containerType || 'STANDARD_CRATE',
      containerCostPerKg: product.containerCostPerKg || 0.45,
      quantity: resolvedQuantity,
    };

    setItems((prev) => {
      if (prev.length > 0 && prev[0].farmerId !== normalizedItem.farmerId) {
        const confirmSwitch = window.confirm(
          `Your cart contains harvest from ${prev[0].farmName}. Clear cart to order from ${normalizedItem.farmName}?`
        );
        if (!confirmSwitch) return prev;
        return [{ ...normalizedItem, quantity: resolvedQuantity }];
      }

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

      return [
        ...prev,
        {
          ...normalizedItem,
          quantity: Math.min(resolvedQuantity, normalizedItem.availableStock),
        },
      ];
    });
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setItems((prev) => {
      if (quantity <= 0) return prev.filter((i) => (i.productId || i.id) !== productId);
      return prev.map((item) => {
        if ((item.productId || item.id) === productId) {
          const clampedQty = Math.min(quantity, item.availableStock);
          return { ...item, quantity: clampedQty };
        }
        return item;
      });
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => (i.productId || i.id) !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const setDeliveryDestination = useCallback((dest: DestinationCoords) => {
    setDestination(dest);
  }, []);

  const totalWeightKg = useMemo(() => {
    return items.reduce((acc, item) => {
      const unit = (item.quantityUnit || item.unit || 'KG').toUpperCase();
      let weightInKg = item.quantity;
      if (unit.includes('QUINTAL')) weightInKg = item.quantity * 100;
      if (unit.includes('TON')) weightInKg = item.quantity * 1000;
      return acc + weightInKg;
    }, 0);
  }, [items]);

  const totalItemsCost = useMemo(() => {
    return items.reduce((acc, item) => acc + item.farmerPrice * item.quantity, 0);
  }, [items]);

  const containerCost = useMemo(() => {
    return items.reduce((acc, item) => {
      const unit = (item.quantityUnit || item.unit || 'KG').toUpperCase();
      let itemWeight = item.quantity;
      if (unit.includes('QUINTAL')) itemWeight = item.quantity * 100;
      if (unit.includes('TON')) itemWeight = item.quantity * 1000;
      const ratePerKg = item.containerCostPerKg || 0.45;
      return acc + itemWeight * ratePerKg;
    }, 0);
  }, [items]);

  const distanceKm = useMemo(() => {
    if (!destination || items.length === 0) return 0;
    const originLat = items[0].farmerLat || 12.5218;
    const originLon = items[0].farmerLon || 76.8951;
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
    return items.reduce((acc, item) => acc + item.quantity, 0);
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
      // Fallback cleanly to local formula
    }
  }, [destination, items, totalWeightKg]);

  return (
    <CartContext.Provider
      value={{
        items,
        cart: items,
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