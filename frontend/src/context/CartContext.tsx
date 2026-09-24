'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { calculateDistanceKm } from '../lib/utils';
import { fetchApi } from '../lib/api';

export type ContainerType = 
  | 'STANDARD_CRATE' 
  | 'COLD_CHAIN_REFRIGERATED' 
  | 'MOISTURE_CONTROLLED' 
  | 'VENTILATED_JUTE';

export const CONTAINER_COST_MAP: Record<ContainerType, number> = {
  STANDARD_CRATE: 0.45,
  COLD_CHAIN_REFRIGERATED: 1.25,
  MOISTURE_CONTROLLED: 0.85,
  VENTILATED_JUTE: 0.30,
};

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
  minOrderKg?: number;
  containerType?: ContainerType;
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
  minOrderKg?: number;
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
  
  // Enhanced Wholesale & Logistics Capabilities
  volumeDiscountPercent: number;
  volumeDiscountAmount: number;
  netProduceCost: number;
  estimatedDeliveryText: string;
  estimatedDeliveryHours: number;
  isMinOrderMet: boolean;
  minOrderDeficitKg: number;
  lastRemovedItem: CartItem | null;
  
  // Actions
  addToCart: (item: AddToCartItem, quantity?: number) => boolean;
  updateQuantity: (productId: string, quantity: number) => void;
  updateContainerType: (productId: string, containerType: ContainerType) => void;
  removeFromCart: (productId: string) => void;
  restoreLastRemovedItem: () => void;
  clearCart: () => void;
  setDeliveryDestination: (dest: DestinationCoords | null) => void;
  refreshFreightQuote: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'fc_cart_session_v2';
const DEST_STORAGE_KEY = 'fc_cart_dest_v2';

const BASE_FREIGHT_FLAT = 150;
const FREIGHT_PER_KM_PER_QUINTAL = 1.85;

// SSR-Safe Native Dialog Helpers
const safeConfirm = (message: string): boolean => {
  if (typeof window === 'undefined') return true;
  const confirmFn = window['confirm'];
  return typeof confirmFn === 'function' ? confirmFn(message) : true;
};

const safeAlert = (message: string): void => {
  if (typeof window === 'undefined') return;
  const alertFn = window['alert'];
  if (typeof alertFn === 'function') alertFn(message);
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [destination, setDestination] = useState<DestinationCoords | null>(null);
  const [serverTransportCost, setServerTransportCost] = useState<number | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [lastRemovedItem, setLastRemovedItem] = useState<CartItem | null>(null);

  // 1. Hydrate cart and destination from localStorage on client mount
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
          const parsedDest = JSON.parse(savedDest);
          if (parsedDest && typeof parsedDest === 'object') {
            setDestination({
              latitude: Number(parsedDest.latitude) || 12.9716,
              longitude: Number(parsedDest.longitude) || 77.5946,
              address: String(parsedDest.address || 'Bengaluru, Karnataka'),
            });
          }
        }
      }
    } catch (err) {
      console.warn('[CartContext] Browser storage hydration notice:', err);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // 2. Sync state changes to browser storage
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
      console.warn('[CartContext] Storage sync notice:', err);
    }
  }, [items, destination, isHydrated]);

  const activeFarmerId = items[0]?.farmerId || null;
  const activeFarmName = items[0]?.farmName || null;

  const addToCart = useCallback((product: AddToCartItem, quantity = 1): boolean => {
    const resolvedProductId = String(product.productId || product.id || '').trim();
    if (!resolvedProductId) {
      console.error('[CartContext] Product must provide a valid productId or id.');
      return false;
    }

    const resolvedAvailableStock = Math.max(0, Number(product.availableStock ?? 9999));
    if (resolvedAvailableStock <= 0) {
      safeAlert('This crop lot is currently out of stock.');
      return false;
    }

    const resolvedPriceUnit = product.priceUnit || product.unit || 'PER_KG';
    const resolvedQuantityUnit = product.quantityUnit || product.unit || 'KG';
    const requestedQty = Math.max(1, Number(product.quantity ?? quantity ?? 1));
    const resolvedQuantity = Math.min(requestedQty, resolvedAvailableStock);

    const safeFarmerPrice = Math.max(0, Number(product.farmerPrice) || 0);
    const containerType: ContainerType = product.containerType || 'STANDARD_CRATE';
    const safeContainerCost = product.containerCostPerKg !== undefined 
      ? Number(product.containerCostPerKg) 
      : CONTAINER_COST_MAP[containerType];

    const normalizedItem: CartItem = {
      ...product,
      productId: resolvedProductId,
      id: resolvedProductId,
      farmerPrice: safeFarmerPrice,
      priceUnit: resolvedPriceUnit,
      quantityUnit: resolvedQuantityUnit,
      unit: product.unit || resolvedPriceUnit,
      availableStock: resolvedAvailableStock,
      minOrderKg: Number(product.minOrderKg) || 10,
      containerType,
      containerCostPerKg: isNaN(safeContainerCost) ? CONTAINER_COST_MAP[containerType] : safeContainerCost,
      quantity: resolvedQuantity,
      farmerLat: product.farmerLat !== undefined ? Number(product.farmerLat) : 12.5218,
      farmerLon: product.farmerLon !== undefined ? Number(product.farmerLon) : 76.8951,
    };

    // Single-farmer validation: Prompts cleanly if switching source farms
    if (items.length > 0 && items[0].farmerId && normalizedItem.farmerId && items[0].farmerId !== normalizedItem.farmerId) {
      const confirmSwitch = safeConfirm(
        `Your cart contains produce from ${items[0].farmName || 'another farmer'}. Replace your cart items to order directly from ${normalizedItem.farmName || 'this cultivator'}?`
      );
      if (!confirmSwitch) {
        return false;
      }
      setItems([{ ...normalizedItem, quantity: resolvedQuantity }]);
      setServerTransportCost(null);
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

    setServerTransportCost(null);
    return true;
  }, [items]);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    const numericQty = Number(quantity);
    if (isNaN(numericQty) || numericQty <= 0) {
      setItems((prev) => {
        const itemToRemove = prev.find((i) => (i.productId || i.id) === productId);
        if (itemToRemove) setLastRemovedItem(itemToRemove);
        return prev.filter((i) => (i.productId || i.id) !== productId);
      });
      setServerTransportCost(null);
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
    setServerTransportCost(null);
  }, []);

  const updateContainerType = useCallback((productId: string, containerType: ContainerType) => {
    const costPerKg = CONTAINER_COST_MAP[containerType] || 0.45;
    setItems((prev) =>
      prev.map((item) => {
        if ((item.productId || item.id) === productId) {
          return {
            ...item,
            containerType,
            containerCostPerKg: costPerKg,
          };
        }
        return item;
      })
    );
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setItems((prev) => {
      const itemToRemove = prev.find((i) => (i.productId || i.id) === productId);
      if (itemToRemove) setLastRemovedItem(itemToRemove);
      return prev.filter((i) => (i.productId || i.id) !== productId);
    });
    setServerTransportCost(null);
  }, []);

  const restoreLastRemovedItem = useCallback(() => {
    if (!lastRemovedItem) return;
    setItems((prev) => [...prev, lastRemovedItem]);
    setLastRemovedItem(null);
    setServerTransportCost(null);
  }, [lastRemovedItem]);

  const clearCart = useCallback(() => {
    setItems([]);
    setServerTransportCost(null);
    setLastRemovedItem(null);
  }, []);

  const setDeliveryDestination = useCallback((dest: DestinationCoords | null) => {
    if (dest) {
      setDestination({
        latitude: Number(dest.latitude) || 12.9716,
        longitude: Number(dest.longitude) || 77.5946,
        address: String(dest.address || 'Karnataka, India'),
      });
    } else {
      setDestination(null);
    }
    setServerTransportCost(null);
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

  // Volume wholesale discount tier
  const volumeDiscountPercent = useMemo(() => {
    if (totalWeightKg >= 500) return 8; // 8% bulk farm direct discount
    if (totalWeightKg >= 250) return 5; // 5% wholesale discount
    if (totalWeightKg >= 100) return 2; // 2% commercial lot discount
    return 0;
  }, [totalWeightKg]);

  const volumeDiscountAmount = useMemo(() => {
    if (volumeDiscountPercent === 0) return 0;
    return Math.round((totalItemsCost * volumeDiscountPercent) / 100);
  }, [totalItemsCost, volumeDiscountPercent]);

  const netProduceCost = useMemo(() => {
    return Math.max(0, totalItemsCost - volumeDiscountAmount);
  }, [totalItemsCost, volumeDiscountAmount]);

  const containerCost = useMemo(() => {
    return items.reduce((acc, item) => {
      const unit = (item.quantityUnit || item.unit || 'KG').toUpperCase();
      const qty = Number(item.quantity) || 0;
      let itemWeight = qty;
      if (unit.includes('QUINTAL')) itemWeight = qty * 100;
      if (unit.includes('TON')) itemWeight = qty * 1000;
      const ratePerKg = Number(item.containerCostPerKg ?? 0.45);
      return acc + itemWeight * ratePerKg;
    }, 0);
  }, [items]);

  const distanceKm = useMemo(() => {
    if (!destination || items.length === 0) return 0;
    const originLat = Number(items[0].farmerLat) || 12.5218;
    const originLon = Number(items[0].farmerLon) || 76.8951;
    const destLat = Number(destination.latitude) || 12.9716;
    const destLon = Number(destination.longitude) || 77.5946;

    const calculated = calculateDistanceKm(originLat, originLon, destLat, destLon);
    return isNaN(calculated) ? 0 : Math.round(calculated);
  }, [destination, items]);

  const transportCost = useMemo(() => {
    if (items.length === 0) return 0;
    if (serverTransportCost !== null && !isNaN(serverTransportCost)) {
      return serverTransportCost;
    }
    if (distanceKm === 0) return BASE_FREIGHT_FLAT;

    const quintals = Math.max(1, totalWeightKg / 100);
    return Math.round((BASE_FREIGHT_FLAT + distanceKm * FREIGHT_PER_KM_PER_QUINTAL * quintals) * 100) / 100;
  }, [items, distanceKm, totalWeightKg, serverTransportCost]);

  const grandTotal = useMemo(() => {
    return Math.round((netProduceCost + transportCost + containerCost) * 100) / 100;
  }, [netProduceCost, transportCost, containerCost]);

  const totalItemsCount = useMemo(() => {
    return items.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);
  }, [items]);

  // Minimum order validation
  const requiredMinOrderKg = useMemo(() => {
    return items.reduce((max, item) => Math.max(max, Number(item.minOrderKg) || 10), 0);
  }, [items]);

  const isMinOrderMet = totalWeightKg >= requiredMinOrderKg;
  const minOrderDeficitKg = Math.max(0, requiredMinOrderKg - totalWeightKg);

  // Delivery estimation
  const estimatedDeliveryHours = useMemo(() => {
    if (distanceKm <= 0) return 24;
    if (distanceKm <= 50) return 6;   // Intra-district
    if (distanceKm <= 150) return 14; // Regional
    return 28;                         // Inter-district state-wide
  }, [distanceKm]);

  const estimatedDeliveryText = useMemo(() => {
    if (distanceKm <= 0) return 'Standard Direct Farm Dispatch';
    if (distanceKm <= 50) return 'Same-Day Farm-Gate Pickup (4-8 hrs)';
    if (distanceKm <= 150) return 'Next-Morning Express Truck (12-18 hrs)';
    return 'Inter-District Cold Freight (24-36 hrs)';
  }, [distanceKm]);

  const refreshFreightQuote = useCallback(async () => {
    if (!destination || items.length === 0) return;
    try {
      const res = await fetchApi('/logistics/quote', {
        method: 'POST',
        body: JSON.stringify({
          cropQuantityKg: totalWeightKg,
          originLat: Number(items[0].farmerLat) || 12.5218,
          originLon: Number(items[0].farmerLon) || 76.8951,
          destLat: Number(destination.latitude) || 12.9716,
          destLon: Number(destination.longitude) || 77.5946,
          containerType: items[0].containerType || 'STANDARD_CRATE',
        }),
      });

      const quote = res?.data || res;
      if (quote && typeof quote.totalCost === 'number' && !isNaN(quote.totalCost)) {
        setServerTransportCost(quote.totalCost);
      }
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

        // Enhanced Fields
        volumeDiscountPercent,
        volumeDiscountAmount,
        netProduceCost,
        estimatedDeliveryText,
        estimatedDeliveryHours,
        isMinOrderMet,
        minOrderDeficitKg,
        lastRemovedItem,

        // Actions
        addToCart,
        updateQuantity,
        updateContainerType,
        removeFromCart,
        restoreLastRemovedItem,
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