'use client';

import React, { useEffect, useState } from 'react';
import { Package, Truck, CheckCircle2, Clock, ArrowRight } from 'lucide-react';

export default function FarmerOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('fc_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/farmer/orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) setOrders(json.data);
    } catch (e) {
      console.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const updateStatus = async (orderId: string, newStatus: string) => {
    try {
      const token = localStorage.getItem('fc_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/farmer/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) fetchOrders();
    } catch (e) {
      alert('Failed to update status');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-6">
      <div>
        <h1 className="text-3xl font-black text-stone-900 tracking-tight">Incoming Farm Orders</h1>
        <p className="text-stone-600 text-sm mt-1">Manage direct consumer purchases, verify container preparation, and track dispatch status.</p>
      </div>

      {loading ? (
        <p className="text-stone-500">Loading incoming orders...</p>
      ) : orders.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-3xl p-12 text-center text-stone-500">
          <Package className="w-12 h-12 mx-auto mb-3 text-stone-300" />
          <p className="font-bold text-stone-800">No orders received yet.</p>
          <p className="text-xs mt-1">Orders placed through the checkout will appear here instantly.</p>
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
                    {order.status}
                  </span>
                  <span className="text-xs text-stone-400 font-mono">ID: {order.id.slice(0, 8)}</span>
                </div>

                <p className="text-sm font-bold text-stone-900">Consumer: {order.consumer.name} ({order.consumer.phone})</p>
                <p className="text-xs text-stone-600"><strong>Delivery Address:</strong> {order.deliveryAddress}</p>

                <div className="pt-2">
                  <p className="text-xs font-black uppercase tracking-wider text-stone-500 mb-1">Ordered Items:</p>
                  <ul className="text-xs space-y-1 text-stone-700">
                    {order.items.map((item: any) => (
                      <li key={item.id}>• {item.product.title} — {item.quantity} {item.product.priceUnit} @ ₹{item.unitPrice} each</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="flex flex-col justify-between items-end border-t md:border-t-0 md:border-l border-stone-200 pt-4 md:pt-0 md:pl-6">
                <div className="text-right">
                  <span className="text-xs text-stone-500 block">Grand Total</span>
                  <span className="text-2xl font-black text-stone-900">₹{order.grandTotal}</span>
                </div>

                <div className="flex items-center gap-2 mt-4">
                  {order.status === 'PENDING' && (
                    <button onClick={() => updateStatus(order.id, 'CONFIRMED')} className="px-4 py-2 bg-amber-600 text-white text-xs font-bold rounded-xl hover:bg-amber-700">
                      Accept Order
                    </button>
                  )}
                  {order.status === 'CONFIRMED' && (
                    <button onClick={() => updateStatus(order.id, 'DISPATCHED')} className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700">
                      Mark Dispatched
                    </button>
                  )}
                  {order.status === 'DISPATCHED' && (
                    <button onClick={() => updateStatus(order.id, 'DELIVERED')} className="px-4 py-2 bg-emerald-800 text-white text-xs font-bold rounded-xl hover:bg-emerald-900">
                      Mark Delivered
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