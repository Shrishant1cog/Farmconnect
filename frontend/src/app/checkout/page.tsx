'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ShoppingBag, Trash2, MapPin, ShieldCheck, 
  ArrowRight, Loader2, AlertCircle, CheckCircle2, 
  AlertTriangle, X, ArrowLeft 
} from 'lucide-react';
import { useCart, CartItem } from '../../context/CartContext';
import { useAuth } from '../../hooks/useAuth';
import { fetchApi } from '../../lib/api';

interface DialogState {
  isOpen: boolean;
  type: 'WARNING' | 'ERROR' | 'SUCCESS';
  title: string;
  message: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { 
    items, 
    activeFarmerId, 
    activeFarmName, 
    totalItemsCost, 
    transportCost, 
    containerCost, 
    grandTotal, 
    updateQuantity, 
    removeFromCart, 
    clearCart 
  } = useCart();

  const initialAddress = 
    (user as any)?.consumerProfile?.deliveryAddress || 
    (user as any)?.address || 
    [(user as any)?.taluk, (user as any)?.district, (user as any)?.state].filter(Boolean).join(', ');

  const [address, setAddress] = useState(initialAddress);
  const [submitting, setSubmitting] = useState(false);
  const [orderComplete, setOrderComplete] = useState<string | null>(null);

  // Modern Centered Dialog Modal State
  const [dialog, setDialog] = useState<DialogState>({
    isOpen: false,
    type: 'WARNING',
    title: '',
    message: '',
  });

  const showDialog = (type: DialogState['type'], title: string, message: string) => {
    setDialog({ isOpen: true, type, title, message });
  };

  const closeDialog = () => {
    setDialog((prev) => ({ ...prev, isOpen: false }));
  };

  useEffect(() => {
    if (initialAddress && !address) {
      setAddress(initialAddress);
    }
  }, [initialAddress]);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      router.push('/login?redirect=/checkout');
      return;
    }

    if (!activeFarmerId || items.length === 0) {
      showDialog(
        'WARNING',
        'Cart Is Empty',
        'Please add produce lots from the marketplace before checking out.'
      );
      return;
    }

    if (!address.trim()) {
      showDialog(
        'WARNING',
        'Delivery Address Required',
        'Please provide a delivery destination or village landmark for transport routing.'
      );
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        farmerId: activeFarmerId,
        deliveryAddress: address.trim(),
        transportCost,
        containerCost,
        items: items.map((i: CartItem) => ({
          productId: i.productId || i.id,
          quantity: i.quantity,
          unitPrice: i.farmerPrice,
        })),
      };

      const res = await fetchApi('/orders', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const orderId = res?.id || res?.data?.id;

      if (res?.success || orderId) {
        setOrderComplete(orderId || 'CONFIRMED');
        clearCart();
      } else {
        showDialog(
          'ERROR',
          'Order Submission Failed',
          res?.message || 'Could not place order. Please check the details.'
        );
      }
    } catch (err: any) {
      showDialog(
        'ERROR',
        'Order Processing Error',
        err.message || 'A network error occurred while submitting your order.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Centered Modal Popup */}
      {dialog.isOpen && (
        <div className="fixed inset-0 z-[100] bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full border border-stone-200 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            
            <div className="flex items-start justify-between gap-3">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                dialog.type === 'SUCCESS' 
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                  : dialog.type === 'ERROR'
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                {dialog.type === 'SUCCESS' && <CheckCircle2 className="w-6 h-6" />}
                {dialog.type === 'ERROR' && <AlertCircle className="w-6 h-6" />}
                {dialog.type === 'WARNING' && <AlertTriangle className="w-6 h-6" />}
              </div>

              <button
                type="button"
                onClick={closeDialog}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h3 className="text-base font-black text-stone-900 tracking-tight">
                {dialog.title}
              </h3>
              <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">
                {dialog.message}
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={closeDialog}
                className={`w-full py-3 rounded-xl font-black text-xs uppercase tracking-wider text-white transition-all shadow-xs active:scale-95 ${
                  dialog.type === 'SUCCESS'
                    ? 'bg-emerald-800 hover:bg-emerald-900'
                    : dialog.type === 'ERROR'
                    ? 'bg-red-700 hover:bg-red-800'
                    : 'bg-stone-900 hover:bg-black'
                }`}
              >
                Dismiss
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Order Complete Screen */}
      {orderComplete ? (
        <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-6 animate-in fade-in duration-200">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-800 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-10 h-10 text-emerald-700" />
          </div>
          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-black uppercase tracking-wider">
              Order Confirmed
            </span>
            <h1 className="text-3xl font-black text-stone-900 tracking-tight">
              Harvest Dispatched for Packing
            </h1>
            <p className="text-sm text-stone-600">
              Order Ref: <span className="font-mono font-bold text-stone-900">{orderComplete.slice(0, 8).toUpperCase()}</span>
            </p>
          </div>
          <p className="text-xs text-stone-500 max-w-md mx-auto">
            The cultivator has received your order and crate specifications. You can monitor fulfillment stages in your order tracker.
          </p>
          <div className="flex justify-center gap-3 pt-4">
            <Link
              href={user?.role === 'FARMER' ? '/farmer/orders' : '/consumer/orders'}
              className="px-6 py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm"
            >
              Track Order
            </Link>
            <Link
              href="/consumer/explore"
              className="px-6 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl transition-colors"
            >
              Browse Marketplace
            </Link>
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-4 animate-in fade-in duration-200">
          <div className="w-16 h-16 bg-stone-100 text-stone-400 rounded-2xl flex items-center justify-center mx-auto">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-stone-900">Your Cart is Empty</h2>
          <p className="text-stone-500 text-xs max-w-sm mx-auto">
            Browse farmlands to select produce directly from certified growers.
          </p>
          <Link
            href="/consumer/explore"
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all"
          >
            Explore Harvests <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-in fade-in duration-200">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Link
                  href="/consumer/explore"
                  className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 hover:text-emerald-950"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </Link>
                {user?.role === 'FARMER' && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                    Cultivator Purchase Mode
                  </span>
                )}
              </div>
              <h1 className="text-3xl font-black text-stone-900 tracking-tight">Direct Wholesale Checkout</h1>
              <p className="text-xs text-stone-500 mt-0.5">
                Ordering harvest directly from <strong className="text-emerald-900">{activeFarmName || 'Direct Farm Producer'}</strong>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-4">
                <h2 className="text-sm font-black uppercase tracking-wider text-stone-500">
                  Harvest Manifest ({items.length} items)
                </h2>

                <div className="divide-y divide-stone-100">
                  {items.map((item: CartItem) => {
                    const itemKey = item.productId || item.id || '';
                    return (
                      <div key={itemKey} className="py-4 flex items-center justify-between gap-4">
                        <div>
                          <h3 className="font-bold text-stone-900 text-sm">{item.title}</h3>
                          <p className="text-xs text-stone-500">
                            ₹{item.farmerPrice} / {(item.priceUnit || 'PER_KG').replace('PER_', '').toLowerCase()}
                          </p>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="flex items-center border border-stone-200 rounded-xl overflow-hidden bg-stone-50">
                            <button
                              type="button"
                              onClick={() => updateQuantity(itemKey, Math.max(1, item.quantity - 1))}
                              className="px-3 py-1 text-stone-600 hover:bg-stone-200 font-bold"
                            >
                              -
                            </button>
                            <span className="px-3 py-1 text-xs font-black text-stone-900">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(itemKey, item.quantity + 1)}
                              className="px-3 py-1 text-stone-600 hover:bg-stone-200 font-bold"
                            >
                              +
                            </button>
                          </div>

                          <span className="font-black text-stone-900 text-sm w-20 text-right">
                            ₹{item.farmerPrice * item.quantity}
                          </span>

                          <button
                            type="button"
                            onClick={() => removeFromCart(itemKey)}
                            className="p-1.5 text-stone-400 hover:text-red-600 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-3">
                <h2 className="text-sm font-black uppercase tracking-wider text-stone-500 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-700" /> Delivery Address
                </h2>
                <textarea
                  required
                  rows={3}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter comprehensive delivery address (Street, Village, Landmark, District, PIN)..."
                  className="w-full p-4 rounded-2xl border border-stone-200 text-xs font-semibold text-stone-900 outline-none focus:ring-2 focus:ring-emerald-700 bg-stone-50/50 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-4">
                <h2 className="text-sm font-black uppercase tracking-wider text-stone-500">
                  Settlement Breakdown
                </h2>

                <div className="space-y-2 text-xs text-stone-600">
                  <div className="flex justify-between">
                    <span>Produce Subtotal:</span>
                    <span className="font-bold text-stone-900">₹{totalItemsCost}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Standardized Crate Deposit:</span>
                    <span className="font-bold text-stone-900">₹{containerCost}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Inter-District Freight:</span>
                    <span className="font-bold text-stone-900">₹{transportCost}</span>
                  </div>
                  <div className="pt-3 border-t border-stone-100 flex justify-between text-base font-black text-stone-900">
                    <span>Total Amount:</span>
                    <span className="text-emerald-900">₹{grandTotal}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handlePlaceOrder}
                  disabled={submitting}
                  className="w-full py-4 bg-emerald-800 hover:bg-emerald-900 disabled:bg-stone-300 text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
                >
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Verifying Order...</>
                  ) : (
                    <>Confirm & Dispatch Order <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </div>

              <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl flex items-center gap-2.5 text-stone-500 text-xs">
                <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
                <span>Direct-from-farm escrow: Payment released upon verified physical inspection.</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}