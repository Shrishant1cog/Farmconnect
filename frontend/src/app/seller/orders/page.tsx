'use client';

import React, { useEffect, useState } from 'react';
import { Package, Truck, CheckCircle2, Clock, ArrowRight } from 'lucide-react';
import { useI18n } from '../../../hooks/useI18n';
import { fetchApi } from '../../../lib/api';

export default function FarmerOrdersPage() {
  const { t, formatNumber, formatCurrency } = useI18n();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      // The shared farmer order list lives on the same backend both clients
      // use: `GET /api/orders/farmer`.
      const json = await fetchApi('/orders/farmer');
      const list = json?.data || json?.orders || (Array.isArray(json) ? json : []);
      setOrders(Array.isArray(list) ? list : []);
    } catch (e: any) {
      console.error('Failed to load orders:', e?.message);
      setOrders([]);
      setLoadError(t('farmer.orders.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateStatus = async (orderId: string, newStatus: string) => {
    try {
      // The shared order status endpoint: `PATCH /api/orders/:id/status`.
      await fetchApi(`/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      fetchOrders();
    } catch (e) {
      alert(t('misc.orders.statusUpdateError'));
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-6">
      <div>
        <h1 className="text-3xl font-black text-stone-900 tracking-tight">{t('misc.orders.title')}</h1>
        <p className="text-stone-600 text-sm mt-1">{t('misc.orders.body')}</p>
      </div>

      {loading ? (
        <p className="text-stone-500">{t('misc.orders.loading')}</p>
      ) : loadError ? (
        <div className="bg-white border border-stone-200 rounded-3xl p-12 text-center text-stone-500 space-y-3">
          <Package className="w-12 h-12 mx-auto text-stone-300" />
          <p className="font-bold text-stone-800 text-sm">{loadError}</p>
          <button
            type="button"
            onClick={fetchOrders}
            className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl"
          >
            {t('common.retry')}
          </button>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-3xl p-12 text-center text-stone-500">
          <Package className="w-12 h-12 mx-auto mb-3 text-stone-300" />
          <p className="font-bold text-stone-800">{t('misc.orders.noOrders')}</p>
          <p className="text-xs mt-1">{t('misc.orders.noOrdersHint')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <div key={order.id} className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between gap-6">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                    order.status === 'CONFIRMED' ? 'bg-amber-100 text-amber-800' :
                    order.status === 'DISPATCHED' ? 'bg-blue-100 text-blue-800' :
                    order.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-800'
                  }`}>
                    {order.status === 'PENDING'
                      ? t('misc.status.pending')
                      : order.status === 'CONFIRMED'
                        ? t('misc.status.confirmed')
                        : order.status === 'DISPATCHED'
                          ? t('misc.status.dispatched')
                          : order.status === 'DELIVERED'
                            ? t('misc.status.delivered')
                            : order.status}
                  </span>
                  <span className="text-xs text-stone-400 font-mono">{t('misc.orders.id')} {order.id.slice(0, 8)}</span>
                </div>

                <p className="text-sm font-bold text-stone-900">{t('misc.orders.consumer')} {order.consumer.name} ({order.consumer.phone})</p>
                <p className="text-xs text-stone-600"><strong>{t('misc.orders.deliveryAddress')}</strong> {order.deliveryAddress}</p>

                <div className="pt-2">
                  <p className="text-xs font-black uppercase tracking-wider text-stone-500 mb-1">{t('misc.orders.orderedItems')}</p>
                  <ul className="text-xs space-y-1 text-stone-700">
                    {order.items.map((item: any) => (
                      <li key={item.id}>• {item.product.title} — {formatNumber(item.quantity)} {item.product.priceUnit} @ {formatCurrency(item.unitPrice)} {t('misc.orders.each')}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="flex flex-col justify-between items-end border-t md:border-t-0 md:border-l border-stone-200 pt-4 md:pt-0 md:pl-6">
                <div className="text-right">
                  <span className="text-xs text-stone-500 block">{t('misc.orders.grandTotal')}</span>
                  <span className="text-2xl font-black text-stone-900">{formatCurrency(order.grandTotal)}</span>
                </div>

                <div className="flex items-center gap-2 mt-4">
                  {order.status === 'PENDING' && (
                    <button onClick={() => updateStatus(order.id, 'CONFIRMED')} className="px-4 py-2 bg-amber-600 text-white text-xs font-bold rounded-xl hover:bg-amber-700">
                      {t('misc.orders.acceptOrder')}
                    </button>
                  )}
                  {order.status === 'CONFIRMED' && (
                    <button onClick={() => updateStatus(order.id, 'DISPATCHED')} className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700">
                      {t('misc.orders.markDispatched')}
                    </button>
                  )}
                  {order.status === 'DISPATCHED' && (
                    <button onClick={() => updateStatus(order.id, 'DELIVERED')} className="px-4 py-2 bg-emerald-800 text-white text-xs font-bold rounded-xl hover:bg-emerald-900">
                      {t('misc.orders.markDelivered')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}