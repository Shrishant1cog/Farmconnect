'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { 
  ShoppingBag, Search, Filter, RefreshCw, CheckCircle2, 
  Clock, Truck, Check, AlertCircle, Loader2, Phone, 
  MapPin, Calendar, Package, ArrowRight, IndianRupee 
} from 'lucide-react';
import { fetchApi } from '../../../lib/api';

export interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  product?: {
    id: string;
    title: string;
    priceUnit?: string;
    imageUrl?: string;
  };
}

export interface FarmerOrder {
  id: string;
  createdAt: string;
  status: 'PENDING' | 'CONFIRMED' | 'PACKED' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED';
  totalAmount: number;
  transportCost?: number;
  containerCost?: number;
  deliveryAddress?: string;
  consumer?: {
    id: string;
    name: string;
    phone?: string;
    district?: string;
  };
  items: OrderItem[];
}

export default function FarmerOrdersPage() {
  const [orders, setOrders] = useState<FarmerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const getAuthToken = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('farmconnect_token') || localStorage.getItem('fc_token');
  };

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    const token = getAuthToken();
    if (!token) {
      setErrorMessage('Please sign in to view customer wholesale orders.');
      setLoading(false);
      return;
    }

    try {
      let data: any;
      try {
        const res = await fetchApi('/orders/farmer');
        data = res?.data || res?.orders || res;
      } catch {
        const baseUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');
        const res = await fetch(`${baseUrl}/orders/farmer`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        data = json?.data || json?.orders || json;
      }

      if (Array.isArray(data)) {
        setOrders(data);
      } else if (data?.orders && Array.isArray(data.orders)) {
        setOrders(data.orders);
      } else {
        setOrders([]);
      }
    } catch (err: any) {
      console.error('Failed to load farmer orders:', err);
      setErrorMessage('Could not load incoming orders from the server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const updateOrderStatus = async (orderId: string, nextStatus: FarmerOrder['status']) => {
    setUpdatingId(orderId);
    const token = getAuthToken();

    try {
      const payload = { status: nextStatus };
      try {
        await fetchApi(`/orders/${orderId}/status`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } catch {
        const baseUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');
        await fetch(`${baseUrl}/orders/${orderId}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        });
      }

      setOrders((prev) =>
        prev.map((ord) => (ord.id === orderId ? { ...ord, status: nextStatus } : ord))
      );
    } catch (err: any) {
      alert(err.message || 'Failed to update order status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch =
        order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.consumer?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.items.some((i) => (i.product?.title || '').toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus = statusFilter === 'ALL' || order.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchTerm, statusFilter]);

  const getStatusBadge = (status: FarmerOrder['status']) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-700" /> Pending Confirmation
          </span>
        );
      case 'CONFIRMED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-900 border border-blue-300 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-blue-700" /> Confirmed / Packing
          </span>
        );
      case 'PACKED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-900 border border-indigo-300 flex items-center gap-1">
            <Package className="w-3 h-3 text-indigo-700" /> Ready for Pickup
          </span>
        );
      case 'DISPATCHED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-900 border border-purple-300 flex items-center gap-1">
            <Truck className="w-3 h-3 text-purple-700" /> In Transit
          </span>
        );
      case 'DELIVERED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
            <Check className="w-3 h-3 text-emerald-700" /> Fulfilled & Settled
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-100 text-red-900 border border-red-300">
            Cancelled
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-200">
      
      {/* Top Banner */}
      <div className="bg-white/90 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-stone-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-950 border border-emerald-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
              <ShoppingBag className="w-3.5 h-3.5 text-emerald-700" /> Farm Gate Orders
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 text-[10px] font-bold">
              Dispatch Dashboard
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-stone-900 tracking-tight">
            Wholesale Customer Orders
          </h1>
          <p className="text-stone-500 text-xs sm:text-sm mt-1 max-w-2xl">
            Track confirmed wholesale lots, update fulfillment checkpoints, coordinate farm-gate truck pickups, and view real-time settlement payouts.
          </p>
        </div>

        <button
          onClick={loadOrders}
          className="p-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-2xl transition-colors self-start md:self-auto"
          title="Refresh Orders"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white/95 backdrop-blur-md p-4 rounded-3xl border border-stone-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Order ID, Buyer, or Crop..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-stone-50 rounded-2xl text-xs font-semibold text-stone-900 border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-600 transition-all"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {['ALL', 'PENDING', 'CONFIRMED', 'PACKED', 'DISPATCHED', 'DELIVERED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === st
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Error Notice */}
      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span className="font-semibold">{errorMessage}</span>
        </div>
      )}

      {/* Orders List */}
      {loading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center text-emerald-800 gap-3">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="font-bold tracking-widest text-xs uppercase text-stone-500">
            Fetching Incoming Orders...
          </span>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center max-w-md mx-auto space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto border border-emerald-100">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-black text-stone-900">No Orders Found</h3>
            <p className="text-xs text-stone-500 mt-1">
              {searchTerm || statusFilter !== 'ALL'
                ? 'Try adjusting your search query or status filter.'
                : 'Customer orders placed for your harvest lots will appear here automatically.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const isProcessing = updatingId === order.id;

            return (
              <div
                key={order.id}
                className="bg-white rounded-3xl border border-stone-200 shadow-xs hover:shadow-md transition-shadow p-6 space-y-5"
              >
                {/* Header: ID, Date, Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-stone-900">
                        Order #{order.id.slice(-8).toUpperCase()}
                      </span>
                      {getStatusBadge(order.status)}
                    </div>
                    <p className="text-xs text-stone-400 font-medium flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> Placed on{' '}
                      {new Date(order.createdAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>

                  {/* Buyer Snapshot */}
                  <div className="text-left sm:text-right space-y-0.5">
                    <span className="text-xs font-bold text-stone-900 block">
                      Buyer: {order.consumer?.name || 'Wholesale Buyer'}
                    </span>
                    {order.consumer?.phone && (
                      <span className="text-xs text-stone-500 flex items-center sm:justify-end gap-1">
                        <Phone className="w-3 h-3 text-stone-400" /> {order.consumer.phone}
                      </span>
                    )}
                    {order.deliveryAddress && (
                      <span className="text-[11px] text-stone-400 flex items-center sm:justify-end gap-1 truncate max-w-xs">
                        <MapPin className="w-3 h-3 text-stone-400 shrink-0" /> {order.deliveryAddress}
                      </span>
                    )}
                  </div>
                </div>

                {/* Items List */}
                <div className="divide-y divide-stone-100">
                  {order.items.map((item, idx) => (
                    <div key={item.id || idx} className="py-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold">
                          🌱
                        </div>
                        <div>
                          <p className="font-bold text-stone-900">
                            {item.product?.title || 'Harvest Produce'}
                          </p>
                          <p className="text-stone-400 text-[11px]">
                            {item.quantity} kg @ ₹{item.price}/kg
                          </p>
                        </div>
                      </div>
                      <span className="font-black text-stone-900">
                        ₹{(item.quantity * item.price).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Footer: Grand Total & Status Progression Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-stone-100">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-bold uppercase text-stone-400">Total Lot Value:</span>
                    <span className="text-2xl font-black text-emerald-800">
                      ₹{order.totalAmount.toLocaleString()}
                    </span>
                  </div>

                  {/* Action Buttons to Progress Order */}
                  <div className="flex flex-wrap items-center gap-2">
                    {order.status === 'PENDING' && (
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => updateOrderStatus(order.id, 'CONFIRMED')}
                        className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 disabled:bg-stone-300 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-transform active:scale-95"
                      >
                        {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        Accept & Confirm Lot
                      </button>
                    )}

                    {order.status === 'CONFIRMED' && (
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => updateOrderStatus(order.id, 'PACKED')}
                        className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 disabled:bg-stone-300 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-transform active:scale-95"
                      >
                        {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Package className="w-3.5 h-3.5" />}
                        Mark Packed in Crates
                      </button>
                    )}

                    {order.status === 'PACKED' && (
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => updateOrderStatus(order.id, 'DISPATCHED')}
                        className="px-4 py-2 bg-purple-700 hover:bg-purple-800 disabled:bg-stone-300 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-transform active:scale-95"
                      >
                        {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Truck className="w-3.5 h-3.5" />}
                        Handover to Transport Truck
                      </button>
                    )}

                    {order.status === 'DISPATCHED' && (
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => updateOrderStatus(order.id, 'DELIVERED')}
                        className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 disabled:bg-stone-300 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-transform active:scale-95"
                      >
                        {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        Confirm Gate Delivery
                      </button>
                    )}

                    {order.status === 'DELIVERED' && (
                      <span className="text-xs font-bold text-emerald-800 flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                        <CheckCircle2 className="w-4 h-4 text-emerald-700" /> Settled to Account
                      </span>
                    )}
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