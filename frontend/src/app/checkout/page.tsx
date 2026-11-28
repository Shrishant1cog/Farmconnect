'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ShoppingBag, Trash2, MapPin, ShieldCheck, 
  ArrowRight, Loader2, AlertCircle, CheckCircle2, 
  AlertTriangle, X, ArrowLeft, Sprout, Truck, IndianRupee,
  Package
} from 'lucide-react';
import { useCart, CartItem } from '../../context/CartContext';
import { useAuth } from '../../hooks/useAuth';
import { useI18n } from '../../hooks/useI18n';
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
  const { t, formatNumber, formatCurrency } = useI18n();
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
    (user as any)?.deliveryAddress ||
    (user as any)?.address || 
    [(user as any)?.taluk, (user as any)?.district, (user as any)?.state].filter(Boolean).join(', ');

  const [address, setAddress] = useState(initialAddress || '');
  const [submitting, setSubmitting] = useState(false);
  const [orderComplete, setOrderComplete] = useState<string | null>(null);

  // Centered Dialog Modal State
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
  }, [initialAddress, address]);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      router.push('/login?redirect=/checkout');
      return;
    }

    if (!activeFarmerId || items.length === 0) {
      showDialog(
        'WARNING',
        t('consumer.checkout.cartIsEmptyTitle'),
        t('consumer.checkout.cartIsEmptyBody')
      );
      return;
    }

    if (!address.trim()) {
      showDialog(
        'WARNING',
        t('consumer.checkout.addressRequiredTitle'),
        t('consumer.checkout.addressRequiredBody')
      );
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        farmerId: activeFarmerId,
        deliveryAddress: address.trim(),
        transportCost: Number(transportCost) || 0,
        containerCost: Number(containerCost) || 0,
        totalAmount: Number(grandTotal) || 0,
        items: items.map((i: CartItem) => ({
          productId: i.productId || i.id,
          quantity: Number(i.quantity) || 1,
          price: Number(i.farmerPrice) || 0,
          unitPrice: Number(i.farmerPrice) || 0,
        })),
      };

      const res: any = await fetchApi('/orders', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const orderId = res?.id || res?.data?.id || res?.order?.id;

      if (res?.success || orderId) {
        setOrderComplete(orderId || 'CONFIRMED');
        clearCart();
      } else {
        showDialog(
          'ERROR',
          t('consumer.checkout.submissionFailedTitle'),
          res?.message || t('consumer.checkout.submissionFailedBody')
        );
      }
    } catch (err: any) {
      showDialog(
        'ERROR',
        t('consumer.checkout.processingErrorTitle'),
        err.message || t('consumer.checkout.processingErrorBody')
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Centered Modal Popup */}
      {dialog.isOpen && (
        <div className="fixed inset-0 z-[100] bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4 transition-all duration-200 animate-in fade-in">
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
                {t('consumer.checkout.dismiss')}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Order Complete Screen */}
      {orderComplete ? (
        <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-6 animate-in fade-in duration-300">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-800 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-10 h-10 text-emerald-700" />
          </div>
          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-black uppercase tracking-wider">
              {t('consumer.checkout.orderConfirmed')}
            </span>
            <h1 className="text-3xl font-black text-stone-900 tracking-tight">
              {t('consumer.checkout.dispatchedPacking')}
            </h1>
            <p className="text-sm text-stone-600">
              {t('consumer.checkout.orderRef', { id: orderComplete.slice(0, 8).toUpperCase() })}
            </p>
          </div>
          <p className="text-xs text-stone-500 max-w-md mx-auto leading-relaxed">
            {t('consumer.checkout.confirmationBody')}
          </p>
          <div className="flex justify-center gap-3 pt-4">
            <Link
              href={user?.role === 'FARMER' ? '/farmer/orders' : '/consumer/orders'}
              className="px-6 py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm active:scale-95 flex items-center gap-2"
            >
              <Truck className="w-4 h-4" /> {t('consumer.checkout.trackOrder')}
            </Link>
            <Link
              href="/consumer/explore"
              className="px-6 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl transition-colors"
            >
              {t('consumer.checkout.browseMarketplace')}
            </Link>
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-4 animate-in fade-in duration-300">
          <div className="w-16 h-16 bg-stone-100 text-stone-400 rounded-3xl flex items-center justify-center mx-auto shadow-2xs">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-stone-900">
            {t('consumer.checkout.cartEmptyTitle')}
          </h2>
          <p className="text-stone-500 text-xs max-w-sm mx-auto leading-relaxed">
            {t('consumer.checkout.cartEmptyBody')}
          </p>
          <Link
            href="/consumer/explore"
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all active:scale-95 shadow-sm"
          >
            {t('consumer.checkout.exploreHarvests')} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-in fade-in duration-300">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Link
                  href="/consumer/explore"
                  className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 hover:text-emerald-950 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> {t('consumer.checkout.backMarketplace')}
                </Link>
                {user?.role === 'FARMER' && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                    {t('consumer.checkout.cultivatorMode')}
                  </span>
                )}
              </div>
              <h1 className="text-3xl font-black text-stone-900 tracking-tight">
                {t('consumer.checkout.wholesaleCheckout')}
              </h1>
              <p className="text-xs text-stone-500 mt-0.5">
                {t('consumer.checkout.orderingDirect', {
                  farm: activeFarmName || t('consumer.checkout.directFarmProducer'),
                })}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-4">
                <h2 className="text-sm font-black uppercase tracking-wider text-stone-500">
                  {t('consumer.checkout.manifest', { count: formatNumber(items.length) })}
                </h2>

                <div className="divide-y divide-stone-100">
                  {items.map((item: CartItem) => {
                    const itemKey = item.productId || item.id || '';
                    return (
                      <div key={itemKey} className="py-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200/60 flex items-center justify-center font-bold shadow-2xs shrink-0">
                            <Sprout className="w-5 h-5 text-emerald-700" />
                          </div>
                          <div>
                            <h3 className="font-bold text-stone-900 text-sm">{item.title}</h3>
                            <p className="text-xs text-stone-500">
                              {formatCurrency(Number(item.farmerPrice) || 0, { maximumFractionDigits: 0 })} / {(item.priceUnit || 'PER_KG').replace('PER_', '').toLowerCase()}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="flex items-center border border-stone-200 rounded-xl overflow-hidden bg-stone-50">
                            <button
                              type="button"
                              onClick={() => updateQuantity(itemKey, Math.max(1, item.quantity - 1))}
                              className="px-3 py-1 text-stone-600 hover:bg-stone-200 font-bold transition-colors"
                            >
                              -
                            </button>
                            <span className="px-3 py-1 text-xs font-black text-stone-900">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(itemKey, item.quantity + 1)}
                              className="px-3 py-1 text-stone-600 hover:bg-stone-200 font-bold transition-colors"
                            >
                              +
                            </button>
                          </div>

                          <span className="font-black text-stone-900 text-sm w-20 text-right">
                            {formatCurrency(
                              Number(item.farmerPrice || 0) * Number(item.quantity || 1),
                              { maximumFractionDigits: 0 }
                            )}
                          </span>

                          <button
                            type="button"
                            onClick={() => removeFromCart(itemKey)}
                            className="p-1.5 text-stone-400 hover:text-red-600 rounded-lg transition-colors"
                            title={t('consumer.checkout.removeProduce')}
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
                  <MapPin className="w-4 h-4 text-emerald-700" /> {t('consumer.checkout.deliveryAddress')}
                </h2>
                <textarea
                  required
                  rows={3}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={t('consumer.checkout.addressPlaceholder')}
                  className="w-full p-4 rounded-2xl border border-stone-200 text-xs font-semibold text-stone-900 outline-none focus:ring-2 focus:ring-emerald-700 bg-stone-50/50 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-4">
                <h2 className="text-sm font-black uppercase tracking-wider text-stone-500">
                  {t('consumer.checkout.settlement')}
                </h2>

                <div className="space-y-2 text-xs text-stone-600">
                  <div className="flex justify-between">
                    <span>{t('consumer.checkout.produceSubtotal')}</span>
                    <span className="font-bold text-stone-900">
                      {formatCurrency(Number(totalItemsCost || 0), { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('consumer.checkout.crateDeposit')}</span>
                    <span className="font-bold text-stone-900">
                      {formatCurrency(Number(containerCost || 0), { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('consumer.checkout.freight')}</span>
                    <span className="font-bold text-stone-900">
                      {formatCurrency(Number(transportCost || 0), { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="pt-3 border-t border-stone-100 flex justify-between text-base font-black text-stone-900">
                    <span>{t('consumer.checkout.totalAmount')}</span>
                    <span className="text-emerald-900">
                      {formatCurrency(Number(grandTotal || 0), { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handlePlaceOrder}
                  disabled={submitting}
                  className="w-full py-4 bg-emerald-800 hover:bg-emerald-900 disabled:bg-stone-300 text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
                >
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin text-white" /> {t('consumer.checkout.verifyingOrder')}</>
                  ) : (
                    <>{t('consumer.checkout.confirmDispatch')} <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </div>

              <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl flex items-center gap-2.5 text-stone-500 text-xs">
                <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
                <span>{t('consumer.checkout.escrow')}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}